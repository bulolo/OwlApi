package service

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type ProjectService interface {
	List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Project, int, error)
	GetByID(ctx context.Context, tenantID, id int64) (*domain.Project, error)
	Create(ctx context.Context, p *domain.Project) error
	Update(ctx context.Context, p *domain.Project) error
	Delete(ctx context.Context, tenantID, id int64) error
}

type projectService struct{ repo domain.ProjectRepository }

func NewProjectService(repo domain.ProjectRepository) ProjectService {
	return &projectService{repo: repo}
}

func (s *projectService) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Project, int, error) {
	return s.repo.ListProjects(ctx, tenantID, p)
}

func (s *projectService) GetByID(ctx context.Context, tenantID, id int64) (*domain.Project, error) {
	return s.repo.GetProjectByID(ctx, tenantID, id)
}

func (s *projectService) Create(ctx context.Context, p *domain.Project) error {
	existing, _ := s.repo.GetProjectByName(ctx, p.TenantID, p.Name)
	if existing != nil {
		return domain.ErrConflictf("project name '%s' already exists", p.Name)
	}
	return s.repo.CreateProject(ctx, p)
}

func (s *projectService) Update(ctx context.Context, p *domain.Project) error {
	return s.repo.UpdateProject(ctx, p)
}

func (s *projectService) Delete(ctx context.Context, tenantID, id int64) error {
	return s.repo.DeleteProject(ctx, tenantID, id)
}
