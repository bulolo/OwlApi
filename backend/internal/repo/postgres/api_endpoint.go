package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type APIEndpointRepo struct{ DB *DB }

var _ domain.APIEndpointRepository = (*APIEndpointRepo)(nil)

const epCols = `id, tenant_id, project_id, group_id, datasource_id, path, methods, summary, description, sql_query, params, param_defs, pre_script_id, post_script_id`

func scanEP(scan func(dest ...any) error) (*domain.APIEndpoint, error) {
	var ep domain.APIEndpoint
	var paramDefsJSON []byte
	err := scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.GroupID, &ep.DataSourceID, &ep.Path, &ep.Methods, &ep.Summary, &ep.Description, &ep.SQL, &ep.Params, &paramDefsJSON, &ep.PreScriptID, &ep.PostScriptID)
	if err != nil {
		return nil, err
	}
	if len(paramDefsJSON) > 0 {
		_ = json.Unmarshal(paramDefsJSON, &ep.ParamDefs)
	}
	return &ep, nil
}

func marshalParamDefs(defs []domain.ParamDef) ([]byte, error) {
	if defs == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(defs)
}

func (r *APIEndpointRepo) GetAPIEndpointByPath(ctx context.Context, tenantID int64, path string) (*domain.APIEndpoint, error) {
	row := r.DB.Pool.QueryRow(ctx, `SELECT `+epCols+` FROM api_endpoints WHERE tenant_id=$1 AND path=$2`, tenantID, path)
	return scanEP(row.Scan)
}

func (r *APIEndpointRepo) GetAPIEndpointByID(ctx context.Context, tenantID, id int64) (*domain.APIEndpoint, error) {
	row := r.DB.Pool.QueryRow(ctx, `SELECT `+epCols+` FROM api_endpoints WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return scanEP(row.Scan)
}

func (r *APIEndpointRepo) CreateAPIEndpoint(ctx context.Context, ep *domain.APIEndpoint) error {
	paramDefs, err := marshalParamDefs(ep.ParamDefs)
	if err != nil {
		return err
	}
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO api_endpoints (tenant_id, project_id, group_id, datasource_id, path, methods, summary, description, sql_query, params, param_defs, pre_script_id, post_script_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
		ep.TenantID, ep.ProjectID, ep.GroupID, ep.DataSourceID, ep.Path, ep.Methods, ep.Summary, ep.Description, ep.SQL, ep.Params, paramDefs, ep.PreScriptID, ep.PostScriptID).Scan(&ep.ID)
}

func (r *APIEndpointRepo) UpdateAPIEndpoint(ctx context.Context, ep *domain.APIEndpoint) error {
	paramDefs, err := marshalParamDefs(ep.ParamDefs)
	if err != nil {
		return err
	}
	_, err = r.DB.Pool.Exec(ctx,
		`UPDATE api_endpoints SET group_id=$1, datasource_id=$2, path=$3, methods=$4, summary=$5, description=$6, sql_query=$7, params=$8, param_defs=$9, pre_script_id=$10, post_script_id=$11 WHERE tenant_id=$12 AND id=$13`,
		ep.GroupID, ep.DataSourceID, ep.Path, ep.Methods, ep.Summary, ep.Description, ep.SQL, ep.Params, paramDefs, ep.PreScriptID, ep.PostScriptID, ep.TenantID, ep.ID)
	return err
}

func (r *APIEndpointRepo) ListAPIEndpoints(ctx context.Context, tenantID, projectID int64, p domain.ListParams) ([]*domain.APIEndpoint, int, error) {
	where := "WHERE tenant_id=$1 AND project_id=$2"
	args := []interface{}{tenantID, projectID}
	argN := 3
	if p.Keyword != "" {
		where += fmt.Sprintf(" AND (path ILIKE $%d OR summary ILIKE $%d)", argN, argN)
		args = append(args, "%"+p.Keyword+"%")
		argN++
	}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM api_endpoints `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, argN, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM api_endpoints %s ORDER BY id%s`, epCols, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.APIEndpoint
	for rows.Next() {
		ep, err := scanEP(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, ep)
	}
	return list, total, rows.Err()
}

func (r *APIEndpointRepo) DeleteAPIEndpoint(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM api_endpoints WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}
