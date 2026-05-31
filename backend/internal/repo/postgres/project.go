package postgres

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type ProjectRepo struct{ DB *DB }

var _ domain.ProjectRepository = (*ProjectRepo)(nil)

const projectSelectCols = `id, tenant_id, slug, name, description, avatar, auth_type, created_at`

func scanProject(row interface {
	Scan(...any) error
}) (*domain.Project, error) {
	var p domain.Project
	err := row.Scan(&p.ID, &p.TenantID, &p.Slug, &p.Name, &p.Description, &p.Avatar, &p.AuthType, &p.CreatedAt)
	if err != nil {
		return nil, nfErr(err, "project")
	}
	return &p, nil
}

func (r *ProjectRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.Project, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+projectSelectCols+` FROM projects WHERE tenant_id=$1 AND id=$2`,
		tenantID, id)
	return scanProject(row)
}

func (r *ProjectRepo) GetByName(ctx context.Context, tenantID int64, name string) (*domain.Project, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+projectSelectCols+` FROM projects WHERE tenant_id=$1 AND name=$2`,
		tenantID, name)
	return scanProject(row)
}

func (r *ProjectRepo) GetBySlug(ctx context.Context, tenantID int64, slug string) (*domain.Project, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+projectSelectCols+` FROM projects WHERE tenant_id=$1 AND slug=$2`,
		tenantID, slug)
	return scanProject(row)
}

func (r *ProjectRepo) Create(ctx context.Context, p *domain.Project) error {
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO projects (tenant_id, slug, name, description, avatar) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		p.TenantID, p.Slug, p.Name, p.Description, p.Avatar).Scan(&p.ID)
}

// CreateWithInitialEnv creates project + default env (+ optional "main" binding)
// in one transaction, so a failure never leaves a half-built project.
func (r *ProjectRepo) CreateWithInitialEnv(ctx context.Context, p *domain.Project, envName string, datasourceID int64) error {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // no-op once committed

	if err := tx.QueryRow(ctx,
		`INSERT INTO projects (tenant_id, slug, name, description, avatar) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
		p.TenantID, p.Slug, p.Name, p.Description, p.Avatar).Scan(&p.ID); err != nil {
		return err
	}

	var envID int64
	if err := tx.QueryRow(ctx,
		`INSERT INTO project_environments (tenant_id, project_id, name, is_default) VALUES ($1,$2,$3,TRUE) RETURNING id`,
		p.TenantID, p.ID, envName).Scan(&envID); err != nil {
		return err
	}

	if datasourceID > 0 {
		// 校验数据源属于本租户（bindings 表无 FK，需手动确认），保证事务内一致。
		var ok bool
		if err := tx.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM datasources WHERE tenant_id=$1 AND id=$2)`,
			p.TenantID, datasourceID).Scan(&ok); err != nil {
			return err
		}
		if !ok {
			return domain.ErrBadRequest("datasource not found in this tenant")
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO endpoint_datasource_bindings (tenant_id, env_id, alias, datasource_id) VALUES ($1,$2,'main',$3)`,
			p.TenantID, envID, datasourceID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *ProjectRepo) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Project, int, error) {
	where := "WHERE tenant_id=$1"
	args := []interface{}{tenantID}
	argN := 2
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (name ILIKE $%d OR description ILIKE $%d)", argN, argN)
		args = append(args, likeWrap(p.Keyword))
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM projects `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT `+projectSelectCols+` FROM projects %s ORDER BY id%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.Project
	for rows.Next() {
		proj, err := scanProject(rows)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, proj)
	}
	return list, total, rows.Err()
}

func (r *ProjectRepo) Update(ctx context.Context, p *domain.Project) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE projects SET slug=$1, name=$2, description=$3, avatar=$4 WHERE tenant_id=$5 AND id=$6`,
		p.Slug, p.Name, p.Description, p.Avatar, p.TenantID, p.ID)
	return err
}

func (r *ProjectRepo) UpdateAuthType(ctx context.Context, tenantID, id int64, authType domain.AuthType) error {
	_, err := r.DB.Pool.Exec(ctx,
		`UPDATE projects SET auth_type=$1 WHERE tenant_id=$2 AND id=$3`,
		authType, tenantID, id)
	return err
}

// Delete removes the project and all project-scoped data in one transaction.
// 这些子表对 projects 没有外键（只有 project_auth_keys / openapi_share_tokens 有
// ON DELETE CASCADE），故需手动清理，否则会留下孤儿接口/分组/环境/版本/日志。
func (r *ProjectRepo) Delete(ctx context.Context, tenantID, id int64) error {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // no-op once committed

	// 1) 依赖接口的表（按 endpoint_id 关联）：版本、激活指针、激活流水、调用日志。
	epSub := `endpoint_id IN (SELECT id FROM api_endpoints WHERE tenant_id=$1 AND project_id=$2)`
	for _, tbl := range []string{
		"endpoint_versions",
		"endpoint_active_version",
		"endpoint_activation_log",
		"endpoint_call_logs",
	} {
		if _, err := tx.Exec(ctx, `DELETE FROM `+tbl+` WHERE tenant_id=$1 AND `+epSub, tenantID, id); err != nil {
			return err
		}
	}

	// 2) 环境内的 alias→datasource 绑定（按 env_id 关联）。
	if _, err := tx.Exec(ctx,
		`DELETE FROM endpoint_datasource_bindings
		 WHERE tenant_id=$1 AND env_id IN (SELECT id FROM project_environments WHERE tenant_id=$1 AND project_id=$2)`,
		tenantID, id); err != nil {
		return err
	}

	// 3) 项目直属表：接口、分组、环境、访问密钥、OpenAPI 分享令牌。
	//    （这些表均无外键，统一在应用层删除。）
	for _, tbl := range []string{
		"api_endpoints", "api_groups", "project_environments",
		"project_auth_keys", "openapi_share_tokens",
	} {
		if _, err := tx.Exec(ctx, `DELETE FROM `+tbl+` WHERE tenant_id=$1 AND project_id=$2`, tenantID, id); err != nil {
			return err
		}
	}

	// 4) 扩展模块注册的项目级清理钩子——无 FK，在同一事务内删（核心无注册时为空）。
	for _, fn := range projectDeleteCleanups {
		if err := fn(ctx, tx, tenantID, id); err != nil {
			return err
		}
	}

	// 5) 项目本身。
	if _, err := tx.Exec(ctx, `DELETE FROM projects WHERE tenant_id=$1 AND id=$2`, tenantID, id); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
