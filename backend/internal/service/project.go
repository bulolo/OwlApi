package service

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type ProjectService interface {
	List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Project, int, error)
	GetByID(ctx context.Context, tenantID, id int64) (*domain.Project, error)
	GetBySlug(ctx context.Context, tenantID int64, slug string) (*domain.Project, error)
	Create(ctx context.Context, p *domain.Project) error
	Update(ctx context.Context, p *domain.Project) error
	Delete(ctx context.Context, tenantID, id int64) error
}

type projectService struct{ repo domain.ProjectRepository }

func NewProjectService(repo domain.ProjectRepository) ProjectService {
	return &projectService{repo: repo}
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

func (s *projectService) Create(ctx context.Context, p *domain.Project) error {
	if existing, _ := s.repo.GetByName(ctx, p.TenantID, p.Name); existing != nil {
		return domain.ErrConflictf("project name '%s' already exists", p.Name)
	}
	if existing, _ := s.repo.GetBySlug(ctx, p.TenantID, p.Slug); existing != nil {
		return domain.ErrConflictf("project slug '%s' already exists", p.Slug)
	}
	return s.repo.Create(ctx, p)
}

func (s *projectService) Update(ctx context.Context, p *domain.Project) error {
	return s.repo.Update(ctx, p)
}

func (s *projectService) Delete(ctx context.Context, tenantID, id int64) error {
	return s.repo.Delete(ctx, tenantID, id)
}
