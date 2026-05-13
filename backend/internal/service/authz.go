package service

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

// AuthorizationService resolves tenant access and role checks.
// Used by HTTP middleware so the transport layer doesn't need direct repo access.
type AuthorizationService interface {
	GetTenantBySlug(ctx context.Context, slug string) (*domain.Tenant, error)
	GetTenantUser(ctx context.Context, tenantID, userID int64) (*domain.TenantUser, error)
}

type authorizationService struct {
	tenants     domain.TenantRepository
	tenantUsers domain.TenantUserRepository
}

func NewAuthorizationService(tenants domain.TenantRepository, tenantUsers domain.TenantUserRepository) AuthorizationService {
	return &authorizationService{tenants: tenants, tenantUsers: tenantUsers}
}

func (s *authorizationService) GetTenantBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	return s.tenants.GetBySlug(ctx, slug)
}

func (s *authorizationService) GetTenantUser(ctx context.Context, tenantID, userID int64) (*domain.TenantUser, error) {
	return s.tenantUsers.GetByTenantAndUser(ctx, tenantID, userID)
}
