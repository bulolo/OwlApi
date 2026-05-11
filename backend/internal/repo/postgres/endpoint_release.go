package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
)

type EndpointReleaseRepo struct{ DB *DB }

var _ domain.EndpointReleaseRepository = (*EndpointReleaseRepo)(nil)

func (r *EndpointReleaseRepo) NextVersion(ctx context.Context, tenantID, endpointID int64) (int, error) {
	var maxVersion int
	err := r.DB.Pool.QueryRow(ctx,
		`SELECT COALESCE(MAX(version), 0) FROM endpoint_releases WHERE tenant_id=$1 AND endpoint_id=$2`,
		tenantID, endpointID).Scan(&maxVersion)
	return maxVersion + 1, err
}

func (r *EndpointReleaseRepo) Create(ctx context.Context, rel *domain.EndpointRelease) error {
	snap, err := json.Marshal(rel.Snapshot)
	if err != nil {
		return err
	}
	return r.DB.Pool.QueryRow(ctx,
		`INSERT INTO endpoint_releases (tenant_id, endpoint_id, version, note, snapshot, published_by, is_active, is_draft)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, published_at`,
		rel.TenantID, rel.EndpointID, rel.Version, rel.Note, snap, rel.PublishedBy, rel.IsActive, rel.IsDraft,
	).Scan(&rel.ID, &rel.PublishedAt)
}

func (r *EndpointReleaseRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.EndpointRelease, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, endpoint_id, version, note, snapshot, published_by, published_at, is_active, is_draft
		 FROM endpoint_releases WHERE tenant_id=$1 AND id=$2`,
		tenantID, id)
	return scanRelease(row.Scan)
}

func (r *EndpointReleaseRepo) GetDraftByEndpoint(ctx context.Context, tenantID, endpointID int64) (*domain.EndpointRelease, error) {
	row := r.DB.Pool.QueryRow(ctx,
		`SELECT id, tenant_id, endpoint_id, version, note, snapshot, published_by, published_at, is_active, is_draft
		 FROM endpoint_releases WHERE tenant_id=$1 AND endpoint_id=$2 AND is_draft=TRUE LIMIT 1`,
		tenantID, endpointID)
	return scanRelease(row.Scan)
}

func (r *EndpointReleaseRepo) UpdateDraftSnapshot(ctx context.Context, tenantID, releaseID int64, snapshot *domain.APIEndpoint) error {
	snap, err := json.Marshal(snapshot)
	if err != nil {
		return err
	}
	_, err = r.DB.Pool.Exec(ctx,
		`UPDATE endpoint_releases SET snapshot=$1, published_at=NOW() WHERE tenant_id=$2 AND id=$3 AND is_draft=TRUE`,
		snap, tenantID, releaseID)
	return err
}

func (r *EndpointReleaseRepo) ListByEndpoint(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointRelease, int, error) {
	where := "WHERE tenant_id=$1 AND endpoint_id=$2"
	args := []interface{}{tenantID, endpointID}

	var total int
	if err := r.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM endpoint_releases `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	pgSuffix, pgArgs := appendPagination(p, 3, args)
	rows, err := r.DB.Pool.Query(ctx,
		fmt.Sprintf(`SELECT id, tenant_id, endpoint_id, version, note, snapshot, published_by, published_at, is_active, is_draft FROM endpoint_releases %s ORDER BY version DESC%s`, where, pgSuffix),
		pgArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var list []*domain.EndpointRelease
	for rows.Next() {
		rel, err := scanRelease(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		list = append(list, rel)
	}
	return list, total, rows.Err()
}

func (r *EndpointReleaseRepo) Activate(ctx context.Context, tenantID, endpointID, releaseID int64) error {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if _, err = tx.Exec(ctx,
		`UPDATE endpoint_releases SET is_active=FALSE WHERE tenant_id=$1 AND endpoint_id=$2`,
		tenantID, endpointID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx,
		`UPDATE endpoint_releases SET is_active=TRUE, is_draft=FALSE WHERE tenant_id=$1 AND id=$2`,
		tenantID, releaseID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx,
		`UPDATE api_endpoints SET published_release_id=$1, status='published' WHERE tenant_id=$2 AND id=$3`,
		releaseID, tenantID, endpointID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *EndpointReleaseRepo) TrimOldReleases(ctx context.Context, tenantID, endpointID int64, keepCount int) error {
	if keepCount <= 0 {
		return nil
	}
	// Delete oldest non-active, non-draft releases beyond keepCount. Drafts and active are always kept.
	_, err := r.DB.Pool.Exec(ctx, `
		DELETE FROM endpoint_releases
		WHERE tenant_id=$1 AND endpoint_id=$2 AND is_active=FALSE AND is_draft=FALSE AND id NOT IN (
			SELECT id FROM endpoint_releases
			WHERE tenant_id=$1 AND endpoint_id=$2 AND is_active=FALSE AND is_draft=FALSE
			ORDER BY version DESC
			LIMIT $3
		)`, tenantID, endpointID, keepCount)
	return err
}

func (r *EndpointReleaseRepo) Deactivate(ctx context.Context, tenantID, endpointID int64) error {
	tx, err := r.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if _, err = tx.Exec(ctx,
		`UPDATE endpoint_releases SET is_active=FALSE WHERE tenant_id=$1 AND endpoint_id=$2`,
		tenantID, endpointID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx,
		`UPDATE api_endpoints SET status='offline' WHERE tenant_id=$1 AND id=$2`,
		tenantID, endpointID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func scanRelease(scan func(dest ...any) error) (*domain.EndpointRelease, error) {
	var rel domain.EndpointRelease
	var snapJSON []byte
	err := scan(&rel.ID, &rel.TenantID, &rel.EndpointID, &rel.Version, &rel.Note, &snapJSON, &rel.PublishedBy, &rel.PublishedAt, &rel.IsActive, &rel.IsDraft)
	if err != nil {
		return nil, err
	}
	if len(snapJSON) > 0 {
		rel.Snapshot = &domain.APIEndpoint{}
		_ = json.Unmarshal(snapJSON, rel.Snapshot)
	}
	return &rel, nil
}
