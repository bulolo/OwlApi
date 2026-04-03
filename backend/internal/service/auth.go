package service

import (
	"context"
	"errors"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/pkg/auth"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailExists        = errors.New("email already registered")
	ErrSlugExists         = errors.New("tenant slug already exists")
)

// ==================== Auth Service ====================

type AuthService interface {
	Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error)
	Login(ctx context.Context, email, password string) (*AuthResponse, error)
}

type RegisterRequest struct {
	Email      string
	Name       string
	Password   string
	TenantName string // optional: create a tenant on registration
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
	// Check duplicate email
	if existing, _ := s.users.GetByEmail(ctx, req.Email); existing != nil {
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

	// If tenant info provided, create tenant and add user as Admin
	if req.TenantSlug != "" {
		if existing, _ := s.tenants.GetBySlug(ctx, req.TenantSlug); existing != nil {
			return nil, ErrSlugExists
		}
		tenant := &domain.Tenant{
			Name:      req.TenantName,
			Slug:      req.TenantSlug,
			Plan:      domain.PlanFree,
			Status:    domain.TenantActive,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		if err := s.tenants.Create(ctx, tenant); err != nil {
			return nil, err
		}
		_ = s.tenantUsers.Add(ctx, &domain.TenantUser{
			TenantID: tenant.ID,
			UserID:   user.ID,
			Role:     domain.RoleAdmin,
			JoinedAt: time.Now(),
		})
		resp.Tenant = tenant
	}

	return resp, nil
}

func (s *authService) Login(ctx context.Context, email, password string) (*AuthResponse, error) {
	user, err := s.users.GetByEmail(ctx, email)
	if err != nil || user == nil {
		return nil, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}
	// Fetch user's tenants (superadmin sees all)
	var tenants []*domain.Tenant
	if user.IsSuperAdmin {
		tenants, _, _ = s.tenants.List(ctx, 1, 10000)
	} else {
		tenantUsers, _ := s.tenantUsers.GetByUserID(ctx, user.ID)
		tenants = make([]*domain.Tenant, 0, len(tenantUsers))
		for _, tu := range tenantUsers {
			if t, err := s.tenants.GetByID(ctx, tu.TenantID); err == nil {
				tenants = append(tenants, t)
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

// ==================== Tenant Service ====================

type TenantService interface {
	Create(ctx context.Context, tenant *domain.Tenant, creatorUserID int64) error
	List(ctx context.Context, page, size int) ([]*domain.Tenant, int, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error)
	Update(ctx context.Context, slug string, name string, plan string, status string) (*domain.Tenant, error)
	Delete(ctx context.Context, slug string) error
	ListByUser(ctx context.Context, userID int64) ([]*domain.Tenant, error)
}

type tenantService struct {
	tenants     domain.TenantRepository
	tenantUsers domain.TenantUserRepository
}

func NewTenantService(tenants domain.TenantRepository, tenantUsers domain.TenantUserRepository) TenantService {
	return &tenantService{tenants: tenants, tenantUsers: tenantUsers}
}

func (s *tenantService) Create(ctx context.Context, tenant *domain.Tenant, creatorUserID int64) error {
	if existing, _ := s.tenants.GetBySlug(ctx, tenant.Slug); existing != nil {
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
	// Creator becomes Admin
	return s.tenantUsers.Add(ctx, &domain.TenantUser{
		TenantID: tenant.ID,
		UserID:   creatorUserID,
		Role:     domain.RoleAdmin,
		JoinedAt: time.Now(),
	})
}

func (s *tenantService) List(ctx context.Context, page, size int) ([]*domain.Tenant, int, error) {
	return s.tenants.List(ctx, page, size)
}

func (s *tenantService) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	return s.tenants.GetBySlug(ctx, slug)
}

func (s *tenantService) Update(ctx context.Context, slug string, name string, plan string, status string) (*domain.Tenant, error) {
	t, err := s.tenants.GetBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if name != "" {
		t.Name = name
	}
	if plan != "" {
		t.Plan = domain.TenantPlan(plan)
	}
	if status != "" {
		t.Status = domain.TenantStatus(status)
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

func (s *tenantService) ListByUser(ctx context.Context, userID int64) ([]*domain.Tenant, error) {
	tenantUsers, err := s.tenantUsers.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	tenants := make([]*domain.Tenant, 0, len(tenantUsers))
	for _, tu := range tenantUsers {
		t, err := s.tenants.GetByID(ctx, tu.TenantID)
		if err == nil && t != nil {
			tenants = append(tenants, t)
		}
	}
	return tenants, nil
}

// ==================== User Service ====================

type TenantUserService interface {
	AddTenantUser(ctx context.Context, tenantID int64, req AddTenantUserRequest) error
	RemoveTenantUser(ctx context.Context, tenantID, userID int64) error
	ListTenantUsers(ctx context.Context, tenantID int64, page, size int) ([]*domain.TenantUser, int, error)
	UpdateTenantUserRole(ctx context.Context, tenantID, userID int64, role domain.UserRole) error
}

type tenantUserService struct {
	users       domain.UserRepository
	tenantUsers domain.TenantUserRepository
}

func NewTenantUserService(users domain.UserRepository, tenantUsers domain.TenantUserRepository) TenantUserService {
	return &tenantUserService{users: users, tenantUsers: tenantUsers}
}

type AddTenantUserRequest struct {
	Email    string
	Name     string
	Password string
	Role     domain.UserRole
}

func (s *tenantUserService) AddTenantUser(ctx context.Context, tenantID int64, req AddTenantUserRequest) error {
	user, _ := s.users.GetByEmail(ctx, req.Email)
	if user == nil {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		user = &domain.User{
			Email: req.Email, Name: req.Name,
			PasswordHash: string(hash), CreatedAt: time.Now(), UpdatedAt: time.Now(),
		}
		if err := s.users.Create(ctx, user); err != nil {
			return err
		}
	}
	return s.tenantUsers.Add(ctx, &domain.TenantUser{
		TenantID: tenantID, UserID: user.ID, Role: req.Role, JoinedAt: time.Now(),
	})
}

func (s *tenantUserService) RemoveTenantUser(ctx context.Context, tenantID, userID int64) error {
	return s.tenantUsers.Remove(ctx, tenantID, userID)
}

func (s *tenantUserService) ListTenantUsers(ctx context.Context, tenantID int64, page, size int) ([]*domain.TenantUser, int, error) {
	return s.tenantUsers.GetByTenantID(ctx, tenantID, page, size)
}

func (s *tenantUserService) UpdateTenantUserRole(ctx context.Context, tenantID, userID int64, role domain.UserRole) error {
	return s.tenantUsers.UpdateRole(ctx, tenantID, userID, role)
}
