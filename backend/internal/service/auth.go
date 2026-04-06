package service

import (
	"context"
	"errors"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/pkg/auth"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = domain.ErrUnauthorized("invalid email or password")
	ErrEmailExists        = domain.ErrConflict("email already registered")
)

type AuthService interface {
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, email, password string) (*AuthResponse, error)
}

type RegisterRequest struct {
	Email      string
	Name       string
	Password   string
	TenantName string
	TenantSlug string
}

type AuthResponse struct {
	User    *domain.User     `json:"user"`
	Token   string           `json:"token"`
	Tenant  *domain.Tenant   `json:"tenant,omitempty"`
	Tenants []*domain.Tenant `json:"tenants,omitempty"`
}

type authService struct {
	users       domain.UserRepository
	tenants     domain.TenantRepository
	tenantUsers domain.TenantUserRepository
}

func NewAuthService(users domain.UserRepository, tenants domain.TenantRepository, tenantUsers domain.TenantUserRepository) AuthService {
	return &authService{users: users, tenants: tenants, tenantUsers: tenantUsers}
}

func (s *authService) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	existing, err := s.users.GetByEmail(ctx, req.Email)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if existing != nil {
		return nil, ErrEmailExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		Email:        req.Email,
		Name:         req.Name,
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}

	token, err := auth.GenerateToken(user.ID, user.Email, user.IsSuperAdmin)
	if err != nil {
		return nil, err
	}
	resp := &AuthResponse{User: user, Token: token}

	if req.TenantSlug != "" {
		existingTenant, err := s.tenants.GetBySlug(ctx, req.TenantSlug)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if existingTenant != nil {
			return nil, ErrSlugExists
		}
		tenant := &domain.Tenant{
			Name: req.TenantName, Slug: req.TenantSlug,
			Plan: domain.PlanFree, Status: domain.TenantActive,
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		}
		if err := s.tenants.Create(ctx, tenant); err != nil {
			return nil, err
		}
		if err := s.tenantUsers.Create(ctx, &domain.TenantUser{
			TenantID: tenant.ID, UserID: user.ID, Role: domain.RoleAdmin, JoinedAt: time.Now(),
		}); err != nil {
			return nil, err
		}
		resp.Tenant = tenant
	}

	return resp, nil
}

func (s *authService) Login(ctx context.Context, email, password string) (*AuthResponse, error) {
	user, err := s.users.GetByEmail(ctx, email)
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	var tenants []*domain.Tenant
	allParams := domain.ListParams{Page: 1, Size: 0}
	if user.IsSuperAdmin {
		tenants, _, err = s.tenants.List(ctx, allParams)
		if err != nil {
			return nil, err
		}
	} else {
		tenantUsers, err := s.tenantUsers.GetByUserID(ctx, user.ID)
		if err != nil {
			return nil, err
		}
		if len(tenantUsers) > 0 {
			ids := make([]int64, len(tenantUsers))
			for i, tu := range tenantUsers {
				ids[i] = tu.TenantID
			}
			tenants, _, err = s.tenants.ListByIDs(ctx, ids, allParams)
			if err != nil {
				return nil, err
			}
		}
	}

	token, err := auth.GenerateToken(user.ID, user.Email, user.IsSuperAdmin)
	if err != nil {
		return nil, err
	}
	resp := &AuthResponse{User: user, Token: token, Tenants: tenants}
	if len(tenants) > 0 {
		resp.Tenant = tenants[0]
	}
	return resp, nil
}
