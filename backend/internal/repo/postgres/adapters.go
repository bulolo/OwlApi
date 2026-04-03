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
func (a *TenantRepo) GetByID(ctx context.Context, id string) (*domain.Tenant, error) {
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
func (a *TenantRepo) Delete(ctx context.Context, id string) error {
	return a.R.DeleteTenant(ctx, id)
}

// ---- UserRepository adapter ----

type UserRepo struct{ R *Repository }

var _ domain.UserRepository = (*UserRepo)(nil)

func (a *UserRepo) Create(ctx context.Context, u *domain.User) error {
	return a.R.CreateUser(ctx, u)
}
func (a *UserRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	return a.R.GetUserByID(ctx, id)
}
func (a *UserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	return a.R.GetUserByEmail(ctx, email)
}

// ---- TenantMemberRepository adapter ----

type MemberRepo struct{ R *Repository }

var _ domain.TenantMemberRepository = (*MemberRepo)(nil)

func (a *MemberRepo) Add(ctx context.Context, m *domain.TenantMember) error {
	return a.R.AddMember(ctx, m)
}
func (a *MemberRepo) Remove(ctx context.Context, tenantID, userID string) error {
	return a.R.RemoveMember(ctx, tenantID, userID)
}
func (a *MemberRepo) GetByTenantID(ctx context.Context, tenantID string, page, size int) ([]*domain.TenantMember, int, error) {
	return a.R.GetMembersByTenantID(ctx, tenantID, page, size)
}
func (a *MemberRepo) GetByUserID(ctx context.Context, userID string) ([]*domain.TenantMember, error) {
	return a.R.GetMembersByUserID(ctx, userID)
}
func (a *MemberRepo) GetMembership(ctx context.Context, tenantID, userID string) (*domain.TenantMember, error) {
	return a.R.GetMembership(ctx, tenantID, userID)
}
func (a *MemberRepo) UpdateRole(ctx context.Context, tenantID, userID string, role domain.UserRole) error {
	return a.R.UpdateMemberRole(ctx, tenantID, userID, role)
}

// ---- RunnerRepository adapter ----

type RunnerRepo struct{ R *Repository }

var _ domain.RunnerRepository = (*RunnerRepo)(nil)

func (a *RunnerRepo) Create(ctx context.Context, runner *domain.Runner) error {
	return a.R.CreateRunner(ctx, runner)
}
func (a *RunnerRepo) GetByID(ctx context.Context, tenantID, id string) (*domain.Runner, error) {
	return a.R.GetRunnerByID(ctx, tenantID, id)
}
func (a *RunnerRepo) UpdateStatus(ctx context.Context, tenantID, id, status string) error {
	return a.R.UpdateRunnerStatus(ctx, tenantID, id, status)
}
func (a *RunnerRepo) Heartbeat(ctx context.Context, tenantID, id string) error {
	return a.R.RunnerHeartbeat(ctx, tenantID, id)
}
