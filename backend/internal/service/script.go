package service

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type ScriptService interface {
	List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Script, int, error)
	GetByID(ctx context.Context, tenantID, id int64) (*domain.Script, error)
	Create(ctx context.Context, s *domain.Script) error
	Update(ctx context.Context, s *domain.Script) error
	Delete(ctx context.Context, tenantID, id int64) error
}

type scriptService struct{ repo domain.ScriptRepository }

func NewScriptService(repo domain.ScriptRepository) ScriptService {
	return &scriptService{repo: repo}
}

func (s *scriptService) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Script, int, error) {
	return s.repo.ListScripts(ctx, tenantID, p)
}

func (s *scriptService) Create(ctx context.Context, sc *domain.Script) error {
	existing, _ := s.repo.GetScriptByName(ctx, sc.TenantID, sc.Name)
	if existing != nil {
		return domain.ErrConflictf("script name '%s' already exists", sc.Name)
	}
	return s.repo.CreateScript(ctx, sc)
}

func (s *scriptService) Update(ctx context.Context, sc *domain.Script) error {
	return s.repo.UpdateScript(ctx, sc)
}

func (s *scriptService) Delete(ctx context.Context, tenantID, id int64) error {
	return s.repo.DeleteScript(ctx, tenantID, id)
}

func (s *scriptService) GetByID(ctx context.Context, tenantID, id int64) (*domain.Script, error) {
	return s.repo.GetScriptByID(ctx, tenantID, id)
}
