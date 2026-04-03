package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailExists        = errors.New("email already registered")
	ErrSlugExists         = errors.New("tenant slug already exists")
	ErrNotMember          = errors.New("user is not a member of this tenant")
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
	users   domain.UserRepository
	tenants domain.TenantRepository
	members domain.TenantMemberRepository
}

func NewAuthService(users domain.UserRepository, tenants domain.TenantRepository, members domain.TenantMemberRepository) AuthService {
	return &authService{users: users, tenants: tenants, members: members}
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
		ID:           generateID("u"),
		Email:        req.Email,
		Name:         req.Name,
		PasswordHash: string(hash),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}

	resp := &AuthResponse{User: user, Token: generateToken()}

	// If tenant info provided, create tenant and add user as Admin
	if req.TenantSlug != "" {
		if existing, _ := s.tenants.GetBySlug(ctx, req.TenantSlug); existing != nil {
			return nil, ErrSlugExists
		}
		tenant := &domain.Tenant{
			ID:        generateID("t"),
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
		_ = s.members.Add(ctx, &domain.TenantMember{
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
	// Fetch user's tenants
	memberships, _ := s.members.GetByUserID(ctx, user.ID)
	tenants := make([]*domain.Tenant, 0, len(memberships))
	for _, m := range memberships {
		if t, err := s.tenants.GetByID(ctx, m.TenantID); err == nil {
			tenants = append(tenants, t)
		}
	}
	resp := &AuthResponse{User: user, Token: generateToken(), Tenants: tenants}
	if len(tenants) > 0 {
		resp.Tenant = tenants[0]
	}
	return resp, nil
}

// ==================== Tenant Service ====================

type TenantService interface {
	Create(ctx context.Context, tenant *domain.Tenant, creatorUserID string) error
	List(ctx context.Context, page, size int) ([]*domain.Tenant, int, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error)
	Update(ctx context.Context, slug string, name string, plan string, status string) (*domain.Tenant, error)
	Delete(ctx context.Context, slug string) error
	ListByUser(ctx context.Context, userID string) ([]*domain.Tenant, error)
}

type tenantService struct {
	tenants domain.TenantRepository
	members domain.TenantMemberRepository
}

func NewTenantService(tenants domain.TenantRepository, members domain.TenantMemberRepository) TenantService {
	return &tenantService{tenants: tenants, members: members}
}

func (s *tenantService) Create(ctx context.Context, tenant *domain.Tenant, creatorUserID string) error {
	if existing, _ := s.tenants.GetBySlug(ctx, tenant.Slug); existing != nil {
		return ErrSlugExists
	}
	tenant.ID = generateID("t")
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
	return s.members.Add(ctx, &domain.TenantMember{
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

func (s *tenantService) ListByUser(ctx context.Context, userID string) ([]*domain.Tenant, error) {
	memberships, err := s.members.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	tenants := make([]*domain.Tenant, 0, len(memberships))
	for _, m := range memberships {
		t, err := s.tenants.GetByID(ctx, m.TenantID)
		if err == nil && t != nil {
			tenants = append(tenants, t)
		}
	}
	return tenants, nil
}

// ==================== Member Service ====================

type MemberService interface {
	AddMember(ctx context.Context, tenantID, userEmail string, role domain.UserRole) error
	RemoveMember(ctx context.Context, tenantID, userID string) error
	ListMembers(ctx context.Context, tenantID string, page, size int) ([]*domain.TenantMember, int, error)
	UpdateRole(ctx context.Context, tenantID, userID string, role domain.UserRole) error
}

type memberService struct {
	users   domain.UserRepository
	members domain.TenantMemberRepository
}

func NewMemberService(users domain.UserRepository, members domain.TenantMemberRepository) MemberService {
	return &memberService{users: users, members: members}
}

func (s *memberService) AddMember(ctx context.Context, tenantID, userEmail string, role domain.UserRole) error {
	user, err := s.users.GetByEmail(ctx, userEmail)
	if err != nil || user == nil {
		return errors.New("user not found")
	}
	return s.members.Add(ctx, &domain.TenantMember{
		TenantID: tenantID,
		UserID:   user.ID,
		Role:     role,
		JoinedAt: time.Now(),
	})
}

func (s *memberService) RemoveMember(ctx context.Context, tenantID, userID string) error {
	return s.members.Remove(ctx, tenantID, userID)
}

func (s *memberService) ListMembers(ctx context.Context, tenantID string, page, size int) ([]*domain.TenantMember, int, error) {
	return s.members.GetByTenantID(ctx, tenantID, page, size)
}

func (s *memberService) UpdateRole(ctx context.Context, tenantID, userID string, role domain.UserRole) error {
	return s.members.UpdateRole(ctx, tenantID, userID, role)
}

// ==================== Helpers ====================

func generateID(prefix string) string {
	b := make([]byte, 8)
	rand.Read(b)
	return prefix + "_" + hex.EncodeToString(b)
}

func generateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}
