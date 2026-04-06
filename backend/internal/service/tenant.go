package service

import (
	"context"
	"errors"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/jackc/pgx/v5"
)

var ErrSlugExists = domain.ErrConflict("tenant slug already exists")

// Valid plan and status values for validation.
var (
	validPlans    = map[domain.TenantPlan]bool{domain.PlanFree: true, domain.PlanPro: true, domain.PlanEnterprise: true}
	validStatuses = map[domain.TenantStatus]bool{domain.TenantActive: true, domain.TenantWarning: true, domain.TenantSuspended: true}
)

type TenantService interface {
	Create(ctx context.Context, tenant *domain.Tenant, creatorUserID int64) error
	List(ctx context.Context, p domain.ListParams) ([]*domain.Tenant, int, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error)
	Update(ctx context.Context, slug string, name, plan, status string) (*domain.Tenant, error)
	Delete(ctx context.Context, slug string) error
	ListByUser(ctx context.Context, userID int64, p domain.ListParams) ([]*domain.Tenant, int, error)
}

type tenantService struct {
	tenants     domain.TenantRepository
	tenantUsers domain.TenantUserRepository
}

func NewTenantService(tenants domain.TenantRepository, tenantUsers domain.TenantUserRepository) TenantService {
	return &tenantService{tenants: tenants, tenantUsers: tenantUsers}
}

func (s *tenantService) Create(ctx context.Context, tenant *domain.Tenant, creatorUserID int64) error {
	existing, err := s.tenants.GetBySlug(ctx, tenant.Slug)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if existing != nil {
		return ErrSlugExists
	}
	tenant.CreatedAt = time.Now()
	tenant.UpdatedAt = time.Now()
	if tenant.Status == "" {
		tenant.Status = domain.TenantActive
	}
	if tenant.Plan == "" {
		tenant.Plan = domain.PlanFree
	}
	if err := s.tenants.Create(ctx, tenant); err != nil {
		return err
	}
	return s.tenantUsers.Create(ctx, &domain.TenantUser{
		TenantID: tenant.ID, UserID: creatorUserID, Role: domain.RoleAdmin, JoinedAt: time.Now(),
	})
}

func (s *tenantService) List(ctx context.Context, p domain.ListParams) ([]*domain.Tenant, int, error) {
	return s.tenants.List(ctx, p)
}

func (s *tenantService) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	return s.tenants.GetBySlug(ctx, slug)
}

func (s *tenantService) Update(ctx context.Context, slug string, name, plan, status string) (*domain.Tenant, error) {
	t, err := s.tenants.GetBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if name != "" {
		t.Name = name
	}
	if plan != "" {
		p := domain.TenantPlan(plan)
		if !validPlans[p] {
			return nil, domain.ErrBadRequestf("invalid plan: %s", plan)
		}
		t.Plan = p
	}
	if status != "" {
		st := domain.TenantStatus(status)
		if !validStatuses[st] {
			return nil, domain.ErrBadRequestf("invalid status: %s", status)
		}
		t.Status = st
	}
	t.UpdatedAt = time.Now()
	if err := s.tenants.Update(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *tenantService) Delete(ctx context.Context, slug string) error {
	t, err := s.tenants.GetBySlug(ctx, slug)
	if err != nil {
		return err
	}
	return s.tenants.Delete(ctx, t.ID)
}

func (s *tenantService) ListByUser(ctx context.Context, userID int64, p domain.ListParams) ([]*domain.Tenant, int, error) {
	tenantUsers, err := s.tenantUsers.GetByUserID(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	if len(tenantUsers) == 0 {
		return nil, 0, nil
	}
	ids := make([]int64, len(tenantUsers))
	for i, tu := range tenantUsers {
		ids[i] = tu.TenantID
	}
	return s.tenants.ListByIDs(ctx, ids, p)
}
