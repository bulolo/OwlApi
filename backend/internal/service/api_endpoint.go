package service

import (
	"context"

	"github.com/bulolo/owlapi/internal/domain"
)

type APIEndpointService interface {
	List(ctx context.Context, tenantID, projectID int64, p domain.ListParams) ([]*domain.APIEndpoint, int, error)
	GetByID(ctx context.Context, tenantID, id int64) (*domain.APIEndpoint, error)
	GetByPath(ctx context.Context, tenantID int64, path string) (*domain.APIEndpoint, error)
	Create(ctx context.Context, ep *domain.APIEndpoint) error
	Update(ctx context.Context, ep *domain.APIEndpoint) error
	Delete(ctx context.Context, tenantID, id int64) error
}

type apiEndpointService struct{ repo domain.APIEndpointRepository }

func NewAPIEndpointService(repo domain.APIEndpointRepository) APIEndpointService {
	return &apiEndpointService{repo: repo}
}

func (s *apiEndpointService) List(ctx context.Context, tenantID, projectID int64, p domain.ListParams) ([]*domain.APIEndpoint, int, error) {
	return s.repo.ListAPIEndpoints(ctx, tenantID, projectID, p)
}

func (s *apiEndpointService) GetByID(ctx context.Context, tenantID, id int64) (*domain.APIEndpoint, error) {
	return s.repo.GetAPIEndpointByID(ctx, tenantID, id)
}

func (s *apiEndpointService) GetByPath(ctx context.Context, tenantID int64, path string) (*domain.APIEndpoint, error) {
	return s.repo.GetAPIEndpointByPath(ctx, tenantID, path)
}

func (s *apiEndpointService) Create(ctx context.Context, ep *domain.APIEndpoint) error {
	ep.InferMeta()
	return s.repo.CreateAPIEndpoint(ctx, ep)
}

func (s *apiEndpointService) Update(ctx context.Context, ep *domain.APIEndpoint) error {
	ep.InferMeta()
	return s.repo.UpdateAPIEndpoint(ctx, ep)
}

func (s *apiEndpointService) Delete(ctx context.Context, tenantID, id int64) error {
	return s.repo.DeleteAPIEndpoint(ctx, tenantID, id)
}
