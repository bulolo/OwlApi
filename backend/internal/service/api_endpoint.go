package service

import (
	"context"
	"fmt"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/pkg/pathutil"
)

type APIEndpointService interface {
	List(ctx context.Context, tenantID, projectID int64, p domain.ListParams) ([]*domain.APIEndpoint, int, error)
	GetByID(ctx context.Context, tenantID, id int64) (*domain.APIEndpoint, error)
	GetByPath(ctx context.Context, tenantID int64, path string) (*domain.APIEndpoint, error)
	// MatchByPath resolves a request path+method to an endpoint and extracts any path parameters.
	// Tries exact path+method match first; falls back to pattern matching across published endpoints.
	MatchByPath(ctx context.Context, tenantID int64, requestPath, method string) (*domain.APIEndpoint, map[string]string, error)
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

func (s *apiEndpointService) MatchByPath(ctx context.Context, tenantID int64, requestPath, method string) (*domain.APIEndpoint, map[string]string, error) {
	// Fast path: exact path + method match (O(1) DB lookup).
	ep, err := s.repo.GetAPIEndpointByPathAndMethod(ctx, tenantID, requestPath, method)
	if err == nil {
		return ep, nil, nil
	}

	// Fallback: pattern match across all published endpoints for this tenant.
	all, err := s.repo.ListPublishedByTenant(ctx, tenantID)
	if err != nil {
		return nil, nil, err
	}

	var bestEp *domain.APIEndpoint
	var bestParams map[string]string
	bestStatic := -1

	for _, candidate := range all {
		if !pathutil.HasParams(candidate.Path) {
			continue // static paths already tried via exact match above
		}
		methodOk := false
		for _, m := range candidate.Methods {
			if m == method {
				methodOk = true
				break
			}
		}
		if !methodOk {
			continue
		}
		params, ok := pathutil.Match(candidate.Path, requestPath)
		if !ok {
			continue
		}
		// Prefer the pattern with the most static segments (most specific match).
		if sc := pathutil.StaticCount(candidate.Path); sc > bestStatic {
			bestStatic = sc
			bestEp = candidate
			bestParams = params
		}
	}

	if bestEp != nil {
		return bestEp, bestParams, nil
	}
	return nil, nil, fmt.Errorf("endpoint not found: %s %s", method, requestPath)
}
