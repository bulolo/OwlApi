package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
)

type APIEndpointRepo struct{ DB *DB }

var _ domain.APIEndpointRepository = (*APIEndpointRepo)(nil)

// All columns are qualified with `ae.` so the same column list can be used
// for plain selects and for the JOIN-flavoured one in List (where bare `id`,
// `created_at`, `updated_at` would otherwise collide with endpoint_versions).
const epCols = `ae.id, ae.tenant_id, ae.project_id, ae.group_id, ae.datasource_id, ae.path, ae.methods, ae.summary, ae.description, ae.sql_query, ae.params, ae.param_defs, ae.pre_script_id, ae.post_script_id, ae.created_at, ae.updated_at`

// epColsWithStatus appends derived columns:
//
//	is_published — whether endpoint_active_version row exists
//	active_version — current live version number (0 if not published)
//	latest_version — MAX(version) across endpoint_versions for this endpoint
//	has_draft — ep.updated_at > eav.activated_at  (or eav is NULL ⇒ draft state if no versions yet)
const epColsWithStatus = epCols + `,
	(eav.version_id IS NOT NULL)                                            AS is_published,
	COALESCE(ev.version, 0)                                                 AS active_version,
	COALESCE(lv.latest_version, 0)                                          AS latest_version,
	(eav.activated_at IS NULL OR ae.updated_at > eav.activated_at)          AS has_draft`

const epJoinStatus = `
	LEFT JOIN endpoint_active_version eav
	  ON eav.tenant_id = ae.tenant_id AND eav.endpoint_id = ae.id
	LEFT JOIN endpoint_versions ev
	  ON ev.tenant_id  = eav.tenant_id AND ev.id          = eav.version_id
	LEFT JOIN (
	  SELECT tenant_id, endpoint_id, MAX(version) AS latest_version
	  FROM endpoint_versions
	  GROUP BY tenant_id, endpoint_id
	) lv ON lv.tenant_id = ae.tenant_id AND lv.endpoint_id = ae.id`

func scanEP(scan func(dest ...any) error) (*domain.APIEndpoint, error) {
	var ep domain.APIEndpoint
	var paramDefsJSON []byte
	err := scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.GroupID, &ep.DataSourceID, &ep.Path, &ep.Methods, &ep.Summary, &ep.Description, &ep.SQL, &ep.Params, &paramDefsJSON, &ep.PreScriptID, &ep.PostScriptID, &ep.CreatedAt, &ep.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if len(paramDefsJSON) > 0 {
		if err := json.Unmarshal(paramDefsJSON, &ep.ParamDefs); err != nil {
			slog.Warn("unmarshal param_defs failed", "err", err)
		}
	}
	return &ep, nil
}

func scanEPWithStatus(scan func(dest ...any) error) (*domain.APIEndpoint, error) {
	var ep domain.APIEndpoint
	var paramDefsJSON []byte
	err := scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.GroupID, &ep.DataSourceID, &ep.Path, &ep.Methods, &ep.Summary, &ep.Description, &ep.SQL, &ep.Params, &paramDefsJSON, &ep.PreScriptID, &ep.PostScriptID, &ep.CreatedAt, &ep.UpdatedAt, &ep.IsPublished, &ep.ActiveVersion, &ep.LatestVersion, &ep.HasDraft)
	if err != nil {
		return nil, err
	}
	if len(paramDefsJSON) > 0 {
		if err := json.Unmarshal(paramDefsJSON, &ep.ParamDefs); err != nil {
			slog.Warn("unmarshal param_defs failed", "err", err)
		}
	}
	return &ep, nil
}

func marshalParamDefs(defs []domain.ParamDef) ([]byte, error) {
	if defs == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(defs)
}

func (r *APIEndpointRepo) GetByPath(ctx context.Context, tenantID int64, path string) (*domain.APIEndpoint, error) {
	row := r.DB.Pool.QueryRow(ctx, `SELECT `+epCols+` FROM api_endpoints ae WHERE ae.tenant_id=$1 AND ae.path=$2`, tenantID, path)
	return scanEP(row.Scan)
}

func (r *APIEndpointRepo) GetByPathAndMethod(ctx context.Context, tenantID, projectID int64, path, method string) (*domain.APIEndpoint, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+epCols+` FROM api_endpoints ae WHERE ae.tenant_id=$1 AND ae.project_id=$2 AND ae.path=$3 AND $4 = ANY(ae.methods)`,
		tenantID, projectID, path, method)
	return scanEP(row.Scan)
}

func (r *APIEndpointRepo) ListPublishedByProject(ctx context.Context, tenantID, projectID int64) ([]*domain.APIEndpoint, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT `+epCols+`
		 FROM api_endpoints ae
		 JOIN endpoint_active_version eav
		   ON eav.tenant_id = ae.tenant_id AND eav.endpoint_id = ae.id
		 WHERE ae.tenant_id=$1 AND ae.project_id=$2`,
		tenantID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.APIEndpoint
	for rows.Next() {
		ep, err := scanEP(rows.Scan)
		if err != nil {
			return nil, err
		}
		list = append(list, ep)
	}
	return list, rows.Err()
}

func (r *APIEndpointRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.APIEndpoint, error) {
	row := r.DB.Pool.QueryRow(ctx, `SELECT `+epCols+` FROM api_endpoints ae WHERE ae.tenant_id=$1 AND ae.id=$2`, tenantID, id)
	return scanEP(row.Scan)
}

func (r *APIEndpointRepo) Create(ctx context.Context, ep *domain.APIEndpoint) error {
	paramDefs, err := marshalParamDefs(ep.ParamDefs)
	if err != nil {
		return err
	}
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO api_endpoints (tenant_id, project_id, group_id, datasource_id, path, methods, summary, description, sql_query, params, param_defs, pre_script_id, post_script_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id, created_at, updated_at`,
		ep.TenantID, ep.ProjectID, ep.GroupID, ep.DataSourceID, ep.Path, ep.Methods, ep.Summary, ep.Description, ep.SQL, ep.Params, paramDefs, ep.PreScriptID, ep.PostScriptID,
	).Scan(&ep.ID, &ep.CreatedAt, &ep.UpdatedAt)
}

func (r *APIEndpointRepo) Update(ctx context.Context, ep *domain.APIEndpoint) error {
	paramDefs, err := marshalParamDefs(ep.ParamDefs)
	if err != nil {
		return err
	}
	_, err = r.DB.Pool.Exec(ctx,
		`UPDATE api_endpoints SET group_id=$1, datasource_id=$2, path=$3, methods=$4, summary=$5, description=$6, sql_query=$7, params=$8, param_defs=$9, pre_script_id=$10, post_script_id=$11, updated_at=NOW() WHERE tenant_id=$12 AND id=$13`,
		ep.GroupID, ep.DataSourceID, ep.Path, ep.Methods, ep.Summary, ep.Description, ep.SQL, ep.Params, paramDefs, ep.PreScriptID, ep.PostScriptID, ep.TenantID, ep.ID)
	return err
}

// RevertFromSnapshot 用版本快照覆盖 api_endpoints，并把 updated_at 设回 activated_at。
// 这样 derived 字段 has_draft = (updated_at > activated_at) 自然就是 false，
// 不需要弄虚作假地写 NOW() 然后再改 activated_at。
func (r *APIEndpointRepo) RevertFromSnapshot(ctx context.Context, tenantID, endpointID int64, snap *domain.APIEndpoint, activatedAt time.Time) error {
	paramDefs, err := marshalParamDefs(snap.ParamDefs)
	if err != nil {
		return err
	}
	_, err = r.DB.Pool.Exec(ctx,
		`UPDATE api_endpoints
		   SET group_id=$1, datasource_id=$2, path=$3, methods=$4, summary=$5, description=$6,
		       sql_query=$7, params=$8, param_defs=$9, pre_script_id=$10, post_script_id=$11,
		       updated_at=$12
		 WHERE tenant_id=$13 AND id=$14`,
		snap.GroupID, snap.DataSourceID, snap.Path, snap.Methods, snap.Summary, snap.Description,
		snap.SQL, snap.Params, paramDefs, snap.PreScriptID, snap.PostScriptID,
		activatedAt,
		tenantID, endpointID)
	return err
}

func (r *APIEndpointRepo) List(ctx context.Context, tenantID, projectID int64, p domain.ListParams) ([]*domain.APIEndpoint, int, error) {
	where := "WHERE ae.tenant_id=$1 AND ae.project_id=$2"
	args := []interface{}{tenantID, projectID}
	argN := 3
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (ae.path ILIKE $%d OR ae.summary ILIKE $%d)", argN, argN)
		args = append(args, likeWrap(p.Keyword))
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM api_endpoints ae `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM api_endpoints ae %s %s ORDER BY ae.id%s`, epColsWithStatus, epJoinStatus, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.APIEndpoint
	for rows.Next() {
		ep, err := scanEPWithStatus(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, ep)
	}
	return list, total, rows.Err()
}

func (r *APIEndpointRepo) Delete(ctx context.Context, tenantID, id int64) error {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	if _, err := tx.Exec(ctx, `DELETE FROM endpoint_active_version WHERE tenant_id=$1 AND endpoint_id=$2`, tenantID, id); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM endpoint_versions WHERE tenant_id=$1 AND endpoint_id=$2`, tenantID, id); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM endpoint_activation_log WHERE tenant_id=$1 AND endpoint_id=$2`, tenantID, id); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM api_endpoints WHERE tenant_id=$1 AND id=$2`, tenantID, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
