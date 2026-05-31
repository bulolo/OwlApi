package postgres

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// ProjectDeleteCleanup runs extra deletes inside the project-deletion transaction.
// EE modules register cleanups for their own project-scoped tables (which have no
// FK to projects), so deleting a project also clears them atomically.
type ProjectDeleteCleanup func(ctx context.Context, tx pgx.Tx, tenantID, projectID int64) error

var projectDeleteCleanups []ProjectDeleteCleanup

// RegisterProjectDeleteCleanup is called at init() (e.g. from EE modules) to hook
// into ProjectRepo.Delete's transaction.
func RegisterProjectDeleteCleanup(fn ProjectDeleteCleanup) {
	projectDeleteCleanups = append(projectDeleteCleanups, fn)
}

// TenantDeleteCleanup runs extra deletes inside the tenant-deletion transaction,
// for EE modules' tenant-scoped tables (no FK to tenants).
type TenantDeleteCleanup func(ctx context.Context, tx pgx.Tx, tenantID int64) error

var tenantDeleteCleanups []TenantDeleteCleanup

// RegisterTenantDeleteCleanup hooks into TenantRepo.Delete's transaction.
func RegisterTenantDeleteCleanup(fn TenantDeleteCleanup) {
	tenantDeleteCleanups = append(tenantDeleteCleanups, fn)
}
