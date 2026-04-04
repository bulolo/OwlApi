package postgres

import (
	"context"

	"github.com/hongjunyao/owlapi/internal/domain"
)

// ---- TenantRepository adapter ----

type TenantRepo struct{ R *Repository }

var _ domain.TenantRepository = (*TenantRepo)(nil)

func (a *TenantRepo) Create(ctx context.Context, t *domain.Tenant) error {
	return a.R.CreateTenant(ctx, t)
}
func (a *TenantRepo) GetByID(ctx context.Context, id int64) (*domain.Tenant, error) {
	return a.R.GetTenantByID(ctx, id)
}
func (a *TenantRepo) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	return a.R.GetTenantBySlug(ctx, slug)
}
func (a *TenantRepo) List(ctx context.Context, page, size int) ([]*domain.Tenant, int, error) {
	return a.R.ListTenants(ctx, page, size)
}
func (a *TenantRepo) Update(ctx context.Context, t *domain.Tenant) error {
	return a.R.UpdateTenant(ctx, t)
}
func (a *TenantRepo) Delete(ctx context.Context, id int64) error {
	return a.R.DeleteTenant(ctx, id)
}

// ---- UserRepository adapter ----

type UserRepo struct{ R *Repository }

var _ domain.UserRepository = (*UserRepo)(nil)

func (a *UserRepo) Create(ctx context.Context, u *domain.User) error {
	return a.R.CreateUser(ctx, u)
}
func (a *UserRepo) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	return a.R.GetUserByID(ctx, id)
}
func (a *UserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	return a.R.GetUserByEmail(ctx, email)
}

// ---- TenantUserRepository adapter ----

type TenantUserRepo struct{ R *Repository }

var _ domain.TenantUserRepository = (*TenantUserRepo)(nil)

func (a *TenantUserRepo) Add(ctx context.Context, m *domain.TenantUser) error {
	return a.R.AddTenantUser(ctx, m)
}
func (a *TenantUserRepo) Remove(ctx context.Context, tenantID, userID int64) error {
	return a.R.RemoveTenantUser(ctx, tenantID, userID)
}
func (a *TenantUserRepo) GetByTenantID(ctx context.Context, tenantID int64, page, size int) ([]*domain.TenantUser, int, error) {
	return a.R.GetTenantUsersByTenantID(ctx, tenantID, page, size)
}
func (a *TenantUserRepo) GetByUserID(ctx context.Context, userID int64) ([]*domain.TenantUser, error) {
	return a.R.GetTenantUsersByUserID(ctx, userID)
}
func (a *TenantUserRepo) GetByTenantAndUser(ctx context.Context, tenantID, userID int64) (*domain.TenantUser, error) {
	return a.R.GetTenantUserByTenantAndUser(ctx, tenantID, userID)
}
func (a *TenantUserRepo) UpdateRole(ctx context.Context, tenantID, userID int64, role domain.UserRole) error {
	return a.R.UpdateTenantUserRole(ctx, tenantID, userID, role)
}

// ---- RunnerRepository adapter ----

type RunnerRepo struct{ R *Repository }

var _ domain.RunnerRepository = (*RunnerRepo)(nil)

func (a *RunnerRepo) Create(ctx context.Context, runner *domain.Runner) error {
	return a.R.CreateRunner(ctx, runner)
}
func (a *RunnerRepo) GetByID(ctx context.Context, tenantID, id int64) (*domain.Runner, error) {
	return a.R.GetRunnerByID(ctx, tenantID, id)
}
func (a *RunnerRepo) UpdateStatus(ctx context.Context, tenantID, id int64, status string) error {
	return a.R.UpdateRunnerStatus(ctx, tenantID, id, status)
}
func (a *RunnerRepo) Heartbeat(ctx context.Context, tenantID, id int64) error {
	return a.R.RunnerHeartbeat(ctx, tenantID, id)
}

// ---- ProjectRepository adapter ----

type ProjectRepo struct{ R *Repository }

var _ domain.ProjectRepository = (*ProjectRepo)(nil)

func (a *ProjectRepo) GetDataSourceByID(ctx context.Context, tenantID, id int64) (*domain.DataSource, error) {
	return a.R.GetDataSourceByID(ctx, tenantID, id)
}
func (a *ProjectRepo) GetAPIEndpointByPath(ctx context.Context, tenantID int64, path string) (*domain.APIEndpoint, error) {
	return a.R.GetAPIEndpointByPath(ctx, tenantID, path)
}
