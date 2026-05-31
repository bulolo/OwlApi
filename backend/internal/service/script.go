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

	// CopyFromBuiltin copies a platform built-in script into the tenant's own
	// library (idempotent: returns the existing copy if one with the same name exists).
	CopyFromBuiltin(ctx context.Context, tenantID, builtinID int64) (*domain.Script, error)

	// Platform-level operations (SuperAdmin only)
	ListPlatform(ctx context.Context, p domain.ListParams) ([]*domain.Script, int, error)
	CreatePlatform(ctx context.Context, s *domain.Script) error
	UpdatePlatform(ctx context.Context, s *domain.Script) error
	DeletePlatform(ctx context.Context, id int64) error
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
	n, err := s.repo.CountReferences(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if n > 0 {
		return domain.ErrConflictf("脚本被 %d 个接口引用，无法删除；请先在接口中解除引用", n)
	}
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *scriptService) GetByID(ctx context.Context, tenantID, id int64) (*domain.Script, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *scriptService) CopyFromBuiltin(ctx context.Context, tenantID, builtinID int64) (*domain.Script, error) {
	src, err := s.repo.GetByID(ctx, tenantID, builtinID)
	if err != nil {
		return nil, err
	}
	if !src.IsPlatform {
		return nil, domain.ErrBadRequest("not a built-in script")
	}
	// 幂等：租户库里已有同名副本则直接返回，不重复创建、不覆盖用户的改动。
	if existing, _ := s.repo.GetByName(ctx, tenantID, src.Name); existing != nil {
		return existing, nil
	}
	cp := &domain.Script{
		TenantID:    tenantID,
		Name:        src.Name,
		Type:        src.Type,
		Code:        src.Code,
		Description: src.Description,
		IsPlatform:  false,
	}
	if err := s.repo.Create(ctx, cp); err != nil {
		return nil, err
	}
	return cp, nil
}

func (s *scriptService) ListPlatform(ctx context.Context, p domain.ListParams) ([]*domain.Script, int, error) {
	return s.repo.ListPlatform(ctx, p)
}

func (s *scriptService) CreatePlatform(ctx context.Context, sc *domain.Script) error {
	sc.IsPlatform = true
	sc.TenantID = 0
	existing, _ := s.repo.GetByName(ctx, 0, sc.Name)
	if existing != nil {
		return domain.ErrConflictf("script name '%s' already exists", sc.Name)
	}
	return s.repo.Create(ctx, sc)
}

func (s *scriptService) UpdatePlatform(ctx context.Context, sc *domain.Script) error {
	return s.repo.UpdatePlatform(ctx, sc)
}

func (s *scriptService) DeletePlatform(ctx context.Context, id int64) error {
	return s.repo.DeletePlatform(ctx, id)
}
