package service

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type APIGroupService interface {
	List(ctx context.Context, tenantID, projectID int64, p domain.ListParams) ([]*domain.APIGroup, int, error)
	Create(ctx context.Context, g *domain.APIGroup) error
	Update(ctx context.Context, g *domain.APIGroup) error
	Delete(ctx context.Context, tenantID, id int64) error
}

type apiGroupService struct{ repo domain.APIGroupRepository }

func NewAPIGroupService(repo domain.APIGroupRepository) APIGroupService {
	return &apiGroupService{repo: repo}
}

func (s *apiGroupService) List(ctx context.Context, tenantID, projectID int64, p domain.ListParams) ([]*domain.APIGroup, int, error) {
	return s.repo.ListAPIGroups(ctx, tenantID, projectID, p)
}

func (s *apiGroupService) Create(ctx context.Context, g *domain.APIGroup) error {
	existing, _ := s.repo.GetAPIGroupByName(ctx, g.TenantID, g.ProjectID, g.Name)
	if existing != nil {
		return domain.ErrConflictf("group name '%s' already exists", g.Name)
	}
	return s.repo.CreateAPIGroup(ctx, g)
}

func (s *apiGroupService) Update(ctx context.Context, g *domain.APIGroup) error {
	return s.repo.UpdateAPIGroup(ctx, g)
}

func (s *apiGroupService) Delete(ctx context.Context, tenantID, id int64) error {
	return s.repo.DeleteAPIGroup(ctx, tenantID, id)
}
