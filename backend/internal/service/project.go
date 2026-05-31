package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/bulolo/owlapi/internal/domain"
)

type ProjectService interface {
	List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Project, int, error)
	GetByID(ctx context.Context, tenantID, id int64) (*domain.Project, error)
	GetBySlug(ctx context.Context, tenantID int64, slug string) (*domain.Project, error)
	// CreateWithInitialEnv atomically creates the project + its default env (+ optional main binding).
	CreateWithInitialEnv(ctx context.Context, p *domain.Project, envName string, datasourceID int64) error
	Update(ctx context.Context, p *domain.Project) error
	Delete(ctx context.Context, tenantID, id int64) error
	// Auth
	UpdateAuthType(ctx context.Context, tenantID, id int64, authType domain.AuthType) error
	GetAuth(ctx context.Context, tenantID, id int64) (domain.AuthType, []*domain.ProjectAuthKey, error)
	CreateAuthKey(ctx context.Context, tenantID, projectID int64, keyType domain.AuthType, name string, expiresAt *time.Time) (*domain.ProjectAuthKey, error)
	DeleteAuthKey(ctx context.Context, tenantID, projectID int64, keyID string) error
	ValidateAuth(ctx context.Context, proj *domain.Project, credential string) error
}

type projectService struct {
	repo     domain.ProjectRepository
	authKeys domain.ProjectAuthKeyRepository
}

func NewProjectService(repo domain.ProjectRepository, authKeys domain.ProjectAuthKeyRepository) ProjectService {
	return &projectService{repo: repo, authKeys: authKeys}
}

func (s *projectService) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Project, int, error) {
	return s.repo.List(ctx, tenantID, p)
}

func (s *projectService) GetByID(ctx context.Context, tenantID, id int64) (*domain.Project, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *projectService) GetBySlug(ctx context.Context, tenantID int64, slug string) (*domain.Project, error) {
	return s.repo.GetBySlug(ctx, tenantID, slug)
}

func (s *projectService) CreateWithInitialEnv(ctx context.Context, p *domain.Project, envName string, datasourceID int64) error {
	if existing, _ := s.repo.GetByName(ctx, p.TenantID, p.Name); existing != nil {
		return domain.ErrConflictf("project name '%s' already exists", p.Name)
	}
	if existing, _ := s.repo.GetBySlug(ctx, p.TenantID, p.Slug); existing != nil {
		return domain.ErrConflictf("project slug '%s' already exists", p.Slug)
	}
	return s.repo.CreateWithInitialEnv(ctx, p, envName, datasourceID)
}

func (s *projectService) Update(ctx context.Context, p *domain.Project) error {
	return s.repo.Update(ctx, p)
}

func (s *projectService) Delete(ctx context.Context, tenantID, id int64) error {
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *projectService) UpdateAuthType(ctx context.Context, tenantID, id int64, authType domain.AuthType) error {
	switch authType {
	case domain.AuthTypePublic, domain.AuthTypeAPIKey, domain.AuthTypeJWT:
	default:
		return domain.ErrBadRequest(fmt.Sprintf("unknown auth_type: %s", authType))
	}
	return s.repo.UpdateAuthType(ctx, tenantID, id, authType)
}

func (s *projectService) GetAuth(ctx context.Context, tenantID, id int64) (domain.AuthType, []*domain.ProjectAuthKey, error) {
	proj, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return "", nil, err
	}
	keys, err := s.authKeys.ListByProject(ctx, tenantID, id)
	if err != nil {
		return "", nil, err
	}
	return proj.AuthType, keys, nil
}

func (s *projectService) CreateAuthKey(ctx context.Context, tenantID, projectID int64, keyType domain.AuthType, name string, expiresAt *time.Time) (*domain.ProjectAuthKey, error) {
	var value string
	switch keyType {
	case domain.AuthTypeAPIKey:
		value = generateAPIKey()
	case domain.AuthTypeJWT:
		value = generateSecret()
	default:
		return nil, domain.ErrBadRequest(fmt.Sprintf("unsupported key type: %s", keyType))
	}
	key := &domain.ProjectAuthKey{
		ID:        uuid.NewString(),
		TenantID:  tenantID,
		ProjectID: projectID,
		Type:      keyType,
		Name:      name,
		Value:     value,
		ExpiresAt: expiresAt,
	}
	if err := s.authKeys.Create(ctx, key); err != nil {
		return nil, err
	}
	return key, nil
}

func (s *projectService) DeleteAuthKey(ctx context.Context, tenantID, projectID int64, keyID string) error {
	return s.authKeys.Delete(ctx, tenantID, projectID, keyID)
}

func (s *projectService) ValidateAuth(ctx context.Context, proj *domain.Project, credential string) error {
	switch proj.AuthType {
	case domain.AuthTypePublic, "":
		return nil

	case domain.AuthTypeAPIKey:
		rawKey := strings.TrimPrefix(strings.TrimSpace(credential), "Bearer ")
		if rawKey == "" {
			return fmt.Errorf("invalid API key")
		}
		key, err := s.authKeys.GetByValue(ctx, proj.TenantID, proj.ID, rawKey)
		if err != nil {
			return fmt.Errorf("invalid API key")
		}
		if key.ExpiresAt != nil && time.Now().After(*key.ExpiresAt) {
			return fmt.Errorf("API key has expired")
		}
		return nil

	case domain.AuthTypeJWT:
		keys, err := s.authKeys.ListByProject(ctx, proj.TenantID, proj.ID)
		if err != nil {
			return fmt.Errorf("invalid JWT token")
		}
		// Filter to jwt keys only
		var jwtKeys []*domain.ProjectAuthKey
		for _, k := range keys {
			if k.Type == domain.AuthTypeJWT {
				jwtKeys = append(jwtKeys, k)
			}
		}
		if len(jwtKeys) == 0 {
			// No keys configured yet — treat as open during setup
			return nil
		}
		tokenStr := strings.TrimPrefix(strings.TrimSpace(credential), "Bearer ")
		if tokenStr == "" {
			return fmt.Errorf("invalid JWT token")
		}
		now := time.Now()
		for _, k := range jwtKeys {
			if k.ExpiresAt != nil && now.After(*k.ExpiresAt) {
				continue
			}
			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
				}
				return []byte(k.Value), nil
			})
			if err == nil && token.Valid {
				return nil
			}
		}
		return fmt.Errorf("invalid JWT token")
	}
	return nil
}

// generateAPIKey returns a key in the form sk-<32 hex chars> (35 chars total).
func generateAPIKey() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return "sk-" + hex.EncodeToString(b)
}

func generateSecret() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}
