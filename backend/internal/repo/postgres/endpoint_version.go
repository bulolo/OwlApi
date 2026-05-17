package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/bulolo/owlapi/internal/domain"
)

type EndpointVersionRepo struct{ DB *DB }

var _ domain.EndpointVersionRepository = (*EndpointVersionRepo)(nil)

const evCols = `id, tenant_id, endpoint_id, version, snapshot, snapshot_v, pre_script_snapshot, post_script_snapshot, datasource_ref, note, created_by, created_at`

func (r *EndpointVersionRepo) NextVersion(ctx context.Context, tenantID, endpointID int64) (int, error) {
	var maxVersion int
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT COALESCE(MAX(version), 0) FROM endpoint_versions WHERE tenant_id=$1 AND endpoint_id=$2`,
		tenantID, endpointID).Scan(&maxVersion)
	return maxVersion + 1, err
}

func (r *EndpointVersionRepo) Create(ctx context.Context, v *domain.EndpointVersion) error {
	snap, err := json.Marshal(v.Snapshot)
	if err != nil {
		return err
	}
	pre, err := marshalNullable(v.PreScriptSnapshot)
	if err != nil {
		return err
	}
	post, err := marshalNullable(v.PostScriptSnapshot)
	if err != nil {
		return err
	}
	dsRef, err := marshalNullable(v.DataSourceRef)
	if err != nil {
		return err
	}
	if v.SnapshotV == 0 {
		v.SnapshotV = 1
	}
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO endpoint_versions (tenant_id, endpoint_id, version, snapshot, snapshot_v, pre_script_snapshot, post_script_snapshot, datasource_ref, note, created_by)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at`,
		v.TenantID, v.EndpointID, v.Version, snap, v.SnapshotV, pre, post, dsRef, v.Note, v.CreatedBy,
	).Scan(&v.ID, &v.CreatedAt)
}

func (r *EndpointVersionRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.EndpointVersion, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+evCols+` FROM endpoint_versions WHERE tenant_id=$1 AND id=$2`,
		tenantID, id)
	return scanVersion(row.Scan)
}

func (r *EndpointVersionRepo) GetByVersion(ctx context.Context, tenantID, endpointID int64, version int) (*domain.EndpointVersion, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT `+evCols+` FROM endpoint_versions WHERE tenant_id=$1 AND endpoint_id=$2 AND version=$3`,
		tenantID, endpointID, version)
	return scanVersion(row.Scan)
}

func (r *EndpointVersionRepo) ListByEndpoint(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointVersion, int, error) {
	where := "WHERE ev.tenant_id=$1 AND ev.endpoint_id=$2"
	args := []interface{}{tenantID, endpointID}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM endpoint_versions ev `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, 3, args)
	// LEFT JOIN endpoint_active_version to compute is_active in one shot.
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT ev.id, ev.tenant_id, ev.endpoint_id, ev.version, ev.snapshot, ev.snapshot_v, ev.pre_script_snapshot, ev.post_script_snapshot, ev.datasource_ref, ev.note, ev.created_by, ev.created_at,
			   (eav.version_id = ev.id) AS is_active
		FROM endpoint_versions ev
		LEFT JOIN endpoint_active_version eav
		  ON eav.tenant_id = ev.tenant_id AND eav.endpoint_id = ev.endpoint_id
		%s ORDER BY ev.version DESC%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.EndpointVersion
	for rows.Next() {
		v, err := scanVersionWithActive(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, v)
	}
	return list, total, rows.Err()
}

func (r *EndpointVersionRepo) Trim(ctx context.Context, tenantID, endpointID int64, keepCount int) error {
	if keepCount <= 0 {
		return nil
	}
	_, err := r.DB.Pool.Exec(ctx, `
		DELETE FROM endpoint_versions
		WHERE tenant_id=$1 AND endpoint_id=$2
		  AND id NOT IN (
		      SELECT id FROM endpoint_versions
		      WHERE tenant_id=$1 AND endpoint_id=$2
		      ORDER BY version DESC
		      LIMIT $3
		  )
		  AND id NOT IN (
		      SELECT version_id FROM endpoint_active_version
		      WHERE tenant_id=$1 AND endpoint_id=$2
		  )`, tenantID, endpointID, keepCount)
	return err
}

func (r *EndpointVersionRepo) DeleteByEndpoint(ctx context.Context, tenantID, endpointID int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM endpoint_versions WHERE tenant_id=$1 AND endpoint_id=$2`,
		tenantID, endpointID)
	return err
}

func (r *EndpointVersionRepo) CountByEndpoint(ctx context.Context, tenantID, endpointID int64) (int, error) {
	var n int
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM endpoint_versions WHERE tenant_id=$1 AND endpoint_id=$2`,
		tenantID, endpointID).Scan(&n)
	return n, err
}

func (r *EndpointVersionRepo) Delete(ctx context.Context, tenantID, id int64) error {
	_, err := r.DB.Pool.Exec(ctx,
		`DELETE FROM endpoint_versions WHERE tenant_id=$1 AND id=$2`,
		tenantID, id)
	return err
}

func marshalNullable(v interface{}) ([]byte, error) {
	if v == nil {
		return nil, nil
	}
	// nil interface containing nil pointer
	switch x := v.(type) {
	case *domain.ScriptSnapshot:
		if x == nil {
			return nil, nil
		}
	case *domain.DataSourceRef:
		if x == nil {
			return nil, nil
		}
	}
	return json.Marshal(v)
}

func scanVersion(scan func(dest ...any) error) (*domain.EndpointVersion, error) {
	var v domain.EndpointVersion
	var snapJSON, preJSON, postJSON, dsJSON []byte
	err := scan(&v.ID, &v.TenantID, &v.EndpointID, &v.Version, &snapJSON, &v.SnapshotV, &preJSON, &postJSON, &dsJSON, &v.Note, &v.CreatedBy, &v.CreatedAt)
	if err != nil {
		return nil, err
	}
	hydrateVersionPayloads(&v, snapJSON, preJSON, postJSON, dsJSON)
	return &v, nil
}

func scanVersionWithActive(scan func(dest ...any) error) (*domain.EndpointVersion, error) {
	var v domain.EndpointVersion
	var snapJSON, preJSON, postJSON, dsJSON []byte
	var isActive *bool
	err := scan(&v.ID, &v.TenantID, &v.EndpointID, &v.Version, &snapJSON, &v.SnapshotV, &preJSON, &postJSON, &dsJSON, &v.Note, &v.CreatedBy, &v.CreatedAt, &isActive)
	if err != nil {
		return nil, err
	}
	hydrateVersionPayloads(&v, snapJSON, preJSON, postJSON, dsJSON)
	if isActive != nil {
		v.IsActive = *isActive
	}
	return &v, nil
}

func hydrateVersionPayloads(v *domain.EndpointVersion, snapJSON, preJSON, postJSON, dsJSON []byte) {
	if len(snapJSON) > 0 {
		v.Snapshot = &domain.APIEndpoint{}
		if err := json.Unmarshal(snapJSON, v.Snapshot); err != nil {
			slog.Warn("unmarshal version snapshot failed", "err", err)
		}
	}
	if len(preJSON) > 0 {
		v.PreScriptSnapshot = &domain.ScriptSnapshot{}
		if err := json.Unmarshal(preJSON, v.PreScriptSnapshot); err != nil {
			slog.Warn("unmarshal pre script snapshot failed", "err", err)
		}
	}
	if len(postJSON) > 0 {
		v.PostScriptSnapshot = &domain.ScriptSnapshot{}
		if err := json.Unmarshal(postJSON, v.PostScriptSnapshot); err != nil {
			slog.Warn("unmarshal post script snapshot failed", "err", err)
		}
	}
	if len(dsJSON) > 0 {
		v.DataSourceRef = &domain.DataSourceRef{}
		if err := json.Unmarshal(dsJSON, v.DataSourceRef); err != nil {
			slog.Warn("unmarshal datasource ref failed", "err", err)
		}
	}
}
