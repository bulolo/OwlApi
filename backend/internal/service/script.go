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
	return s.repo.List(ctx, tenantID, p)
}

func (s *scriptService) Create(ctx context.Context, sc *domain.Script) error {
	existing, _ := s.repo.GetByName(ctx, sc.TenantID, sc.Name)
	if existing != nil {
		return domain.ErrConflictf("script name '%s' already exists", sc.Name)
	}
	return s.repo.Create(ctx, sc)
}

func (s *scriptService) Update(ctx context.Context, sc *domain.Script) error {
	existing, err := s.repo.GetByID(ctx, sc.TenantID, sc.ID)
	if err != nil {
		return err
	}
	if existing.IsPlatform {
		return domain.ErrForbidden("cannot modify a platform built-in script")
	}
	return s.repo.Update(ctx, sc)
}

func (s *scriptService) Delete(ctx context.Context, tenantID, id int64) error {
	sc, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if sc.IsPlatform {
		return domain.ErrForbidden("cannot delete a platform built-in script")
	}
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *scriptService) GetByID(ctx context.Context, tenantID, id int64) (*domain.Script, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}
