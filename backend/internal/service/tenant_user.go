package service

import (
	"context"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

type TenantUserService interface {
	Create(ctx context.Context, tenantID int64, req AddTenantUserRequest) error
	Delete(ctx context.Context, tenantID, userID int64) error
	List(ctx context.Context, tenantID int64, page, size int) ([]*domain.TenantUser, int, error)
	UpdateRole(ctx context.Context, tenantID, userID int64, role domain.UserRole) error
}

type AddTenantUserRequest struct {
	Email    string
	Name     string
	Password string
	Role     domain.UserRole
}

type tenantUserService struct {
	users       domain.UserRepository
	tenantUsers domain.TenantUserRepository
}

func NewTenantUserService(users domain.UserRepository, tenantUsers domain.TenantUserRepository) TenantUserService {
	return &tenantUserService{users: users, tenantUsers: tenantUsers}
}

func (s *tenantUserService) Create(ctx context.Context, tenantID int64, req AddTenantUserRequest) error {
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
	return s.tenantUsers.Create(ctx, &domain.TenantUser{
		TenantID: tenantID, UserID: user.ID, Role: req.Role, JoinedAt: time.Now(),
	})
}

func (s *tenantUserService) Delete(ctx context.Context, tenantID, userID int64) error {
	return s.tenantUsers.Delete(ctx, tenantID, userID)
}

func (s *tenantUserService) List(ctx context.Context, tenantID int64, page, size int) ([]*domain.TenantUser, int, error) {
	return s.tenantUsers.List(ctx, tenantID, page, size)
}

func (s *tenantUserService) UpdateRole(ctx context.Context, tenantID, userID int64, role domain.UserRole) error {
	return s.tenantUsers.UpdateRole(ctx, tenantID, userID, role)
}
