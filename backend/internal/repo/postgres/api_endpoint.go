package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hongjunyao/owlapi/internal/domain"
)

const epCols = `id, tenant_id, project_id, group_id, datasource_id, path, methods, summary, description, sql_query, params, param_defs, pre_script_id, post_script_id`

func scanEP(scan func(dest ...any) error) (*domain.APIEndpoint, error) {
	var ep domain.APIEndpoint
	var paramDefsJSON []byte
	err := scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.GroupID, &ep.DataSourceID, &ep.Path, &ep.Methods, &ep.Summary, &ep.Description, &ep.SQL, &ep.Params, &paramDefsJSON, &ep.PreScriptID, &ep.PostScriptID)
	if err != nil {
		return nil, err
	}
	if len(paramDefsJSON) > 0 {
		if err := json.Unmarshal(paramDefsJSON, &ep.ParamDefs); err != nil {
			return nil, err
		}
	}
	return &ep, nil
}

func marshalParamDefs(defs []domain.ParamDef) ([]byte, error) {
	if defs == nil {
		return []byte("[]"), nil
	}
	b, err := json.Marshal(defs)
	if err != nil {
		return nil, fmt.Errorf("marshal param_defs: %w", err)
	}
	return b, nil
}

func (r *ProjectRepo) GetAPIEndpointByPath(ctx context.Context, tenantID int64, path string) (*domain.APIEndpoint, error) {
	row := r.DB.Pool.QueryRow(ctx, `SELECT `+epCols+` FROM api_endpoints WHERE tenant_id=$1 AND path=$2`, tenantID, path)
	return scanEP(row.Scan)
}

func (r *ProjectRepo) GetAPIEndpointByID(ctx context.Context, tenantID, id int64) (*domain.APIEndpoint, error) {
	row := r.DB.Pool.QueryRow(ctx, `SELECT `+epCols+` FROM api_endpoints WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return scanEP(row.Scan)
}

func (r *ProjectRepo) CreateAPIEndpoint(ctx context.Context, ep *domain.APIEndpoint) error {
	paramDefs, err := marshalParamDefs(ep.ParamDefs)
	if err != nil {
		return err
	}
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO api_endpoints (tenant_id, project_id, group_id, datasource_id, path, methods, summary, description, sql_query, params, param_defs, pre_script_id, post_script_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
		ep.TenantID, ep.ProjectID, ep.GroupID, ep.DataSourceID, ep.Path, ep.Methods, ep.Summary, ep.Description, ep.SQL, ep.Params, paramDefs, ep.PreScriptID, ep.PostScriptID).Scan(&ep.ID)
}

func (r *ProjectRepo) UpdateAPIEndpoint(ctx context.Context, ep *domain.APIEndpoint) error {
	paramDefs, err := marshalParamDefs(ep.ParamDefs)
	if err != nil {
		return err
	}
	_, err = r.DB.Pool.Exec(ctx,
		`UPDATE api_endpoints SET group_id=$1, datasource_id=$2, path=$3, methods=$4, summary=$5, description=$6, sql_query=$7, params=$8, param_defs=$9, pre_script_id=$10, post_script_id=$11 WHERE tenant_id=$12 AND id=$13`,
		ep.GroupID, ep.DataSourceID, ep.Path, ep.Methods, ep.Summary, ep.Description, ep.SQL, ep.Params, paramDefs, ep.PreScriptID, ep.PostScriptID, ep.TenantID, ep.ID)
	return err
}

func (r *ProjectRepo) ListAPIEndpoints(ctx context.Context, tenantID, projectID int64) ([]*domain.APIEndpoint, error) {
	rows, err := r.DB.Pool.Query(ctx, `SELECT `+epCols+`, created_at FROM api_endpoints WHERE tenant_id=$1 AND project_id=$2 ORDER BY id`, tenantID, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*domain.APIEndpoint
	for rows.Next() {
		var ep domain.APIEndpoint
		var paramDefsJSON []byte
		var createdAt interface{}
		if err := rows.Scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.GroupID, &ep.DataSourceID, &ep.Path, &ep.Methods, &ep.Summary, &ep.Description, &ep.SQL, &ep.Params, &paramDefsJSON, &ep.PreScriptID, &ep.PostScriptID, &createdAt); err != nil {
			return nil, err
		}
		if len(paramDefsJSON) > 0 {
			if err := json.Unmarshal(paramDefsJSON, &ep.ParamDefs); err != nil {
				return nil, err
			}
		}
		list = append(list, &ep)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return list, nil
}

func (r *ProjectRepo) DeleteAPIEndpoint(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx, `DELETE FROM api_endpoints WHERE tenant_id=$1 AND id=$2`, tenantID, id)
	return err
}
