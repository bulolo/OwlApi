package service

import (
	"context"
	"log/slog"

	"github.com/bulolo/owlapi/internal/domain"
)

type EndpointReleaseService interface {
	// Publish activates the existing draft release (or creates one from current state if none exists).
	Publish(ctx context.Context, tenantID, endpointID, publishedBy int64, note string, maxVersions int) (*domain.EndpointRelease, error)
	ListReleases(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointRelease, int, error)
	GetRelease(ctx context.Context, tenantID, releaseID int64) (*domain.EndpointRelease, error)
	// Activate publishes any specific release (draft or historical) by ID.
	Activate(ctx context.Context, tenantID, endpointID, releaseID int64) error
	// UpsertDraft creates or updates the single draft snapshot for an endpoint.
	UpsertDraft(ctx context.Context, tenantID, endpointID, publishedBy int64) error
	// Unpublish takes the endpoint offline without deleting release history.
	Unpublish(ctx context.Context, tenantID, endpointID int64) error
}

type endpointReleaseService struct {
	releases  domain.EndpointReleaseRepository
	endpoints domain.APIEndpointRepository
}

func NewEndpointReleaseService(releases domain.EndpointReleaseRepository, endpoints domain.APIEndpointRepository) EndpointReleaseService {
	return &endpointReleaseService{releases: releases, endpoints: endpoints}
}

func (s *endpointReleaseService) Publish(ctx context.Context, tenantID, endpointID, publishedBy int64, note string, maxVersions int) (*domain.EndpointRelease, error) {
	// Activate the existing draft if one exists.
	draft, err := s.releases.GetDraftByEndpoint(ctx, tenantID, endpointID)
	if err == nil {
		if err := s.releases.Activate(ctx, tenantID, endpointID, draft.ID); err != nil {
			return nil, err
		}
		if err := s.releases.TrimOldReleases(ctx, tenantID, endpointID, maxVersions); err != nil {
			slog.Warn("trim old releases failed", "endpoint_id", endpointID, "err", err)
		}
		draft.IsActive = true
		draft.IsDraft = false
		return draft, nil
	}

	// No draft — create a release directly from current endpoint state.
	ep, err := s.endpoints.GetByID(ctx, tenantID, endpointID)
	if err != nil {
		return nil, err
	}
	version, err := s.releases.NextVersion(ctx, tenantID, endpointID)
	if err != nil {
		return nil, err
	}
	rel := &domain.EndpointRelease{
		TenantID: tenantID, EndpointID: endpointID,
		Version: version, Note: note,
		Snapshot: ep, PublishedBy: publishedBy,
	}
	if err := s.releases.Create(ctx, rel); err != nil {
		return nil, err
	}
	if err := s.releases.Activate(ctx, tenantID, endpointID, rel.ID); err != nil {
		return nil, err
	}
	if err := s.releases.TrimOldReleases(ctx, tenantID, endpointID, maxVersions); err != nil {
		slog.Warn("trim old releases failed", "endpoint_id", endpointID, "err", err)
	}
	rel.IsActive = true
	return rel, nil
}

func (s *endpointReleaseService) Activate(ctx context.Context, tenantID, endpointID, releaseID int64) error {
	if err := s.releases.Activate(ctx, tenantID, endpointID, releaseID); err != nil {
		return err
	}
	rel, err := s.releases.GetByID(ctx, tenantID, releaseID)
	if err != nil {
		return err
	}
	snap := rel.Snapshot
	snap.TenantID = tenantID
	snap.ID = endpointID
	snap.Status = "published"
	return s.endpoints.Update(ctx, snap)
}

func (s *endpointReleaseService) UpsertDraft(ctx context.Context, tenantID, endpointID, publishedBy int64) error {
	ep, err := s.endpoints.GetByID(ctx, tenantID, endpointID)
	if err != nil {
		return err
	}
	draft, err := s.releases.GetDraftByEndpoint(ctx, tenantID, endpointID)
	if err == nil {
		return s.releases.UpdateDraftSnapshot(ctx, tenantID, draft.ID, ep)
	}
	version, err := s.releases.NextVersion(ctx, tenantID, endpointID)
	if err != nil {
		return err
	}
	return s.releases.Create(ctx, &domain.EndpointRelease{
		TenantID: tenantID, EndpointID: endpointID,
		Version: version, PublishedBy: publishedBy,
		Snapshot: ep, IsDraft: true,
	})
}

func (s *endpointReleaseService) ListReleases(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointRelease, int, error) {
	return s.releases.ListByEndpoint(ctx, tenantID, endpointID, p)
}

func (s *endpointReleaseService) GetRelease(ctx context.Context, tenantID, releaseID int64) (*domain.EndpointRelease, error) {
	return s.releases.GetByID(ctx, tenantID, releaseID)
}

func (s *endpointReleaseService) Unpublish(ctx context.Context, tenantID, endpointID int64) error {
	return s.releases.Deactivate(ctx, tenantID, endpointID)
}
