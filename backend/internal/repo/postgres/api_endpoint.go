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

// nonNilIDs ensures a non-nil slice so pgx encodes an empty BIGINT[] '{}'
// instead of NULL (the column is NOT NULL).
// marshalScriptSteps serializes a pre/post chain to JSONB; nil → "[]".
func marshalScriptSteps(steps []domain.ScriptStep) ([]byte, error) {
	if steps == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(steps)
}

// All columns are qualified with `ae.` so the same column list can be used
// for plain selects and for the JOIN-flavoured one in List.
const epCols = `ae.id, ae.tenant_id, ae.project_id, ae.group_id, ae.datasource_alias, ae.path, ae.method, ae.summary, ae.description, ae.sql_query, ae.param_defs, ae.response_defs, ae.pre_scripts, ae.post_scripts, ae.created_at, ae.updated_at`

// epColsWithStatus adds derived columns:
//
//	latest_version — MAX(version) across endpoint_versions for this endpoint
//	has_draft      — true iff no version exists yet OR ae.updated_at is newer than
//	                 the most recent activation across ALL envs (i.e. there's an
//	                 unpublished edit; if nothing is active anywhere yet but a
//	                 version exists, draft state == false).
const epColsWithStatus = epCols + `,
	COALESCE(lv.latest_version, 0) AS latest_version,
	CASE
	  WHEN lv.latest_version IS NULL THEN TRUE
	  WHEN maxact.last_activated_at IS NULL THEN FALSE
	  ELSE ae.updated_at > maxact.last_activated_at
	END AS has_draft`

const epJoinStatus = `
	LEFT JOIN (
	  SELECT tenant_id, endpoint_id, MAX(version) AS latest_version
	  FROM endpoint_versions
	  GROUP BY tenant_id, endpoint_id
	) lv ON lv.tenant_id = ae.tenant_id AND lv.endpoint_id = ae.id
	LEFT JOIN (
	  SELECT tenant_id, endpoint_id, MAX(activated_at) AS last_activated_at
	  FROM endpoint_active_version
	  GROUP BY tenant_id, endpoint_id
	) maxact ON maxact.tenant_id = ae.tenant_id AND maxact.endpoint_id = ae.id`

// hydrateEPJSON unmarshals the JSONB columns shared by both scan variants.
func hydrateEPJSON(ep *domain.APIEndpoint, paramDefsJSON, responseDefsJSON, preScriptsJSON, postScriptsJSON []byte) {
	if len(paramDefsJSON) > 0 {
		if err := json.Unmarshal(paramDefsJSON, &ep.ParamDefs); err != nil {
			slog.Warn("unmarshal param_defs failed", "err", err)
		}
	}
	if len(responseDefsJSON) > 0 {
		if err := json.Unmarshal(responseDefsJSON, &ep.ResponseDefs); err != nil {
			slog.Warn("unmarshal response_defs failed", "err", err)
		}
	}
	if len(preScriptsJSON) > 0 {
		if err := json.Unmarshal(preScriptsJSON, &ep.PreScripts); err != nil {
			slog.Warn("unmarshal pre_scripts failed", "err", err)
		}
	}
	if len(postScriptsJSON) > 0 {
		if err := json.Unmarshal(postScriptsJSON, &ep.PostScripts); err != nil {
			slog.Warn("unmarshal post_scripts failed", "err", err)
		}
	}
}

func scanEP(scan func(dest ...any) error) (*domain.APIEndpoint, error) {
	var ep domain.APIEndpoint
	var paramDefsJSON, responseDefsJSON, preScriptsJSON, postScriptsJSON []byte
	err := scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.GroupID, &ep.DataSourceAlias, &ep.Path, &ep.Method, &ep.Summary, &ep.Description, &ep.SQL, &paramDefsJSON, &responseDefsJSON, &preScriptsJSON, &postScriptsJSON, &ep.CreatedAt, &ep.UpdatedAt)
	if err != nil {
		return nil, nfErr(err, "endpoint")
	}
	hydrateEPJSON(&ep, paramDefsJSON, responseDefsJSON, preScriptsJSON, postScriptsJSON)
	return &ep, nil
}

func scanEPWithStatus(scan func(dest ...any) error) (*domain.APIEndpoint, error) {
	var ep domain.APIEndpoint
	var paramDefsJSON, responseDefsJSON, preScriptsJSON, postScriptsJSON []byte
	err := scan(&ep.ID, &ep.TenantID, &ep.ProjectID, &ep.GroupID, &ep.DataSourceAlias, &ep.Path, &ep.Method, &ep.Summary, &ep.Description, &ep.SQL, &paramDefsJSON, &responseDefsJSON, &preScriptsJSON, &postScriptsJSON, &ep.CreatedAt, &ep.UpdatedAt, &ep.LatestVersion, &ep.HasDraft)
	if err != nil {
		return nil, err
	}
	hydrateEPJSON(&ep, paramDefsJSON, responseDefsJSON, preScriptsJSON, postScriptsJSON)
	return &ep, nil
}

func marshalParamDefs(defs []domain.ParamDef) ([]byte, error) {
	if defs == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(defs)
}

func marshalResponseDefs(defs []domain.ResponseDef) ([]byte, error) {
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
		`SELECT `+epCols+` FROM api_endpoints ae WHERE ae.tenant_id=$1 AND ae.project_id=$2 AND ae.path=$3 AND ae.method=$4`,
		tenantID, projectID, path, method)
	return scanEP(row.Scan)
}

// ListPublishedInEnv returns endpoints that have an active version in the given env.
func (r *APIEndpointRepo) ListPublishedInEnv(ctx context.Context, tenantID, projectID, envID int64) ([]*domain.APIEndpoint, error) {
	rows, err := r.DB.Pool.Query(ctx,
		`SELECT `+epCols+`
		 FROM api_endpoints ae
		 JOIN endpoint_active_version eav
		   ON eav.tenant_id = ae.tenant_id AND eav.endpoint_id = ae.id AND eav.env_id = $3
		 WHERE ae.tenant_id=$1 AND ae.project_id=$2`,
		tenantID, projectID, envID)
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
	responseDefs, err := marshalResponseDefs(ep.ResponseDefs)
	if err != nil {
		return err
	}
	preScripts, err := marshalScriptSteps(ep.PreScripts)
	if err != nil {
		return err
	}
	postScripts, err := marshalScriptSteps(ep.PostScripts)
	if err != nil {
		return err
	}
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO api_endpoints (tenant_id, project_id, group_id, datasource_alias, path, method, summary, description, sql_query, param_defs, response_defs, pre_scripts, post_scripts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id, created_at, updated_at`,
		ep.TenantID, ep.ProjectID, ep.GroupID, ep.DataSourceAlias, ep.Path, ep.Method, ep.Summary, ep.Description, ep.SQL, paramDefs, responseDefs, preScripts, postScripts,
	).Scan(&ep.ID, &ep.CreatedAt, &ep.UpdatedAt)
}

func (r *APIEndpointRepo) Update(ctx context.Context, ep *domain.APIEndpoint) error {
	paramDefs, err := marshalParamDefs(ep.ParamDefs)
	if err != nil {
		return err
	}
	responseDefs, err := marshalResponseDefs(ep.ResponseDefs)
	if err != nil {
		return err
	}
	preScripts, err := marshalScriptSteps(ep.PreScripts)
	if err != nil {
		return err
	}
	postScripts, err := marshalScriptSteps(ep.PostScripts)
	if err != nil {
		return err
	}
	_, err = r.DB.Pool.Exec(ctx,
		`UPDATE api_endpoints SET group_id=$1, datasource_alias=$2, path=$3, method=$4, summary=$5, description=$6, sql_query=$7, param_defs=$8, response_defs=$9, pre_scripts=$10, post_scripts=$11, updated_at=NOW() WHERE tenant_id=$12 AND id=$13`,
		ep.GroupID, ep.DataSourceAlias, ep.Path, ep.Method, ep.Summary, ep.Description, ep.SQL, paramDefs, responseDefs, preScripts, postScripts, ep.TenantID, ep.ID)
	return err
}

// RevertFromSnapshot rewrites api_endpoints from a version snapshot and sets
// updated_at = activatedAt so derived has_draft becomes false for that env.
func (r *APIEndpointRepo) RevertFromSnapshot(ctx context.Context, tenantID, endpointID int64, snap *domain.APIEndpoint, activatedAt time.Time) error {
	paramDefs, err := marshalParamDefs(snap.ParamDefs)
	if err != nil {
		return err
	}
	responseDefs, err := marshalResponseDefs(snap.ResponseDefs)
	if err != nil {
		return err
	}
	preScripts, err := marshalScriptSteps(snap.PreScripts)
	if err != nil {
		return err
	}
	postScripts, err := marshalScriptSteps(snap.PostScripts)
	if err != nil {
		return err
	}
	_, err = r.DB.Pool.Exec(ctx,
		`UPDATE api_endpoints
		   SET group_id=$1, datasource_alias=$2, path=$3, method=$4, summary=$5, description=$6,
		       sql_query=$7, param_defs=$8, response_defs=$9, pre_scripts=$10, post_scripts=$11,
		       updated_at=$12
		 WHERE tenant_id=$13 AND id=$14`,
		snap.GroupID, snap.DataSourceAlias, snap.Path, snap.Method, snap.Summary, snap.Description,
		snap.SQL, paramDefs, responseDefs, preScripts, postScripts,
		activatedAt,
		tenantID, endpointID)
	return err
}

func (r *APIEndpointRepo) List(ctx context.Context, tenantID, projectID int64, p domain.ListParams) ([]*domain.APIEndpoint, int, error) {
	where := "WHERE ae.tenant_id=$1 AND ae.project_id=$2"
	args := []interface{}{tenantID, projectID}
	argN := 3
	if p.GroupID != 0 {
		where += fmt.Sprintf(" AND ae.group_id=$%d", argN)
		args = append(args, p.GroupID)
		argN++
	}
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
