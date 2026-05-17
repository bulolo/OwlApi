package service

import (
	"context"
	"errors"
	"log/slog"

	"github.com/bulolo/owlapi/internal/domain"
)

// EndpointVersionService is the public API of the versioning subsystem.
//
// Conceptual model:
//
//	api_endpoints           = draft / working copy (always mutable, no version semantics)
//	endpoint_versions       = immutable history (one row per CreateVersion)
//	endpoint_active_version = single authoritative pointer to "what's live now"
//
// "Publish" is just sugar for `CreateVersion + Activate`. They are exposed
// independently so a future review/staging workflow can pull them apart.
type EndpointVersionService interface {
	// CreateVersion freezes the current api_endpoints row into an immutable version.
	// Does NOT change what's live.
	CreateVersion(ctx context.Context, tenantID, endpointID, actorID int64, note string, maxVersions int) (*domain.EndpointVersion, error)

	// Activate flips endpoint_active_version to point at the given version. No-op
	// if it's already pointing there. Triggers a rollback log entry if the requested
	// version is older than the currently active one.
	Activate(ctx context.Context, tenantID, endpointID, versionID, actorID int64) error

	// Publish = CreateVersion + Activate, the default UX path.
	Publish(ctx context.Context, tenantID, endpointID, actorID int64, note string, maxVersions int) (*domain.EndpointVersion, error)

	// Unpublish deletes the active pointer. Versions remain in history.
	Unpublish(ctx context.Context, tenantID, endpointID, actorID int64) error

	// ListVersions paginates immutable history for an endpoint, newest first.
	ListVersions(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointVersion, int, error)

	// GetVersion returns a single version by ID.
	GetVersion(ctx context.Context, tenantID, versionID int64) (*domain.EndpointVersion, error)

	// GetActiveSnapshot resolves the currently-active version for a request-time lookup.
	GetActiveSnapshot(ctx context.Context, tenantID, endpointID int64) (*domain.EndpointVersion, error)

	// ListActivationLog returns audit-trail entries for an endpoint
	// (publish / activate / rollback / unpublish / version_deleted), newest first.
	ListActivationLog(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointActivationLog, int, error)

	// DeleteVersion removes a specific version from history. Guard rails:
	//   • cannot delete the currently active version
	//   • cannot delete the only remaining version
	// Always writes a "version_deleted" entry to the activation log.
	DeleteVersion(ctx context.Context, tenantID, endpointID, versionID, actorID int64) error

	// RevertToActive 丢弃所有未发布的修改，把 api_endpoints 草稿恢复到当前激活版本的内容。
	// 关键：updated_at 显式写为 activated_at，让 derived 字段 has_draft 立刻变 false。
	// 写一条 "revert" 流水。
	RevertToActive(ctx context.Context, tenantID, endpointID, actorID int64) error
}

type endpointVersionService struct {
	versions   domain.EndpointVersionRepository
	active     domain.EndpointActiveVersionRepository
	log        domain.EndpointActivationLogRepository
	endpoints  domain.APIEndpointRepository
	scripts    domain.ScriptRepository
	datasource domain.DataSourceRepository
}

func NewEndpointVersionService(
	versions domain.EndpointVersionRepository,
	active domain.EndpointActiveVersionRepository,
	log domain.EndpointActivationLogRepository,
	endpoints domain.APIEndpointRepository,
	scripts domain.ScriptRepository,
	datasource domain.DataSourceRepository,
) EndpointVersionService {
	return &endpointVersionService{
		versions:   versions,
		active:     active,
		log:        log,
		endpoints:  endpoints,
		scripts:    scripts,
		datasource: datasource,
	}
}

func (s *endpointVersionService) CreateVersion(ctx context.Context, tenantID, endpointID, actorID int64, note string, maxVersions int) (*domain.EndpointVersion, error) {
	ep, err := s.endpoints.GetByID(ctx, tenantID, endpointID)
	if err != nil {
		return nil, err
	}
	version, err := s.versions.NextVersion(ctx, tenantID, endpointID)
	if err != nil {
		return nil, err
	}
	v := &domain.EndpointVersion{
		TenantID:           tenantID,
		EndpointID:         endpointID,
		Version:            version,
		Snapshot:           ep,
		SnapshotV:          1,
		PreScriptSnapshot:  s.snapshotScript(ctx, tenantID, ep.PreScriptID),
		PostScriptSnapshot: s.snapshotScript(ctx, tenantID, ep.PostScriptID),
		DataSourceRef:      s.snapshotDataSourceRef(ctx, tenantID, ep.DataSourceID),
		Note:               note,
		CreatedBy:          actorID,
	}
	if err := s.versions.Create(ctx, v); err != nil {
		return nil, err
	}
	if err := s.versions.Trim(ctx, tenantID, endpointID, maxVersions); err != nil {
		slog.Warn("trim old versions failed", "endpoint_id", endpointID, "err", err)
	}
	return v, nil
}

func (s *endpointVersionService) Activate(ctx context.Context, tenantID, endpointID, versionID, actorID int64) error {
	target, err := s.versions.GetByID(ctx, tenantID, versionID)
	if err != nil {
		return err
	}
	if target.EndpointID != endpointID {
		return errors.New("version does not belong to endpoint")
	}

	action := domain.ActivationActionActivate
	current, err := s.active.Get(ctx, tenantID, endpointID)
	if err == nil && current != nil && current.Version > target.Version {
		action = domain.ActivationActionRollback
	}

	if err := s.active.Upsert(ctx, tenantID, endpointID, versionID, actorID); err != nil {
		return err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, versionID, target.Version, actorID, action); err != nil {
		slog.Warn("append activation log failed", "endpoint_id", endpointID, "err", err)
	}
	return nil
}

func (s *endpointVersionService) Publish(ctx context.Context, tenantID, endpointID, actorID int64, note string, maxVersions int) (*domain.EndpointVersion, error) {
	v, err := s.CreateVersion(ctx, tenantID, endpointID, actorID, note, maxVersions)
	if err != nil {
		return nil, err
	}
	if err := s.active.Upsert(ctx, tenantID, endpointID, v.ID, actorID); err != nil {
		return nil, err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, v.ID, v.Version, actorID, domain.ActivationActionPublish); err != nil {
		slog.Warn("append activation log failed", "endpoint_id", endpointID, "err", err)
	}
	v.IsActive = true
	return v, nil
}

func (s *endpointVersionService) Unpublish(ctx context.Context, tenantID, endpointID, actorID int64) error {
	if err := s.active.Delete(ctx, tenantID, endpointID); err != nil {
		return err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, 0, 0, actorID, domain.ActivationActionUnpublish); err != nil {
		slog.Warn("append activation log failed", "endpoint_id", endpointID, "err", err)
	}
	return nil
}

func (s *endpointVersionService) ListVersions(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointVersion, int, error) {
	return s.versions.ListByEndpoint(ctx, tenantID, endpointID, p)
}

func (s *endpointVersionService) GetVersion(ctx context.Context, tenantID, versionID int64) (*domain.EndpointVersion, error) {
	return s.versions.GetByID(ctx, tenantID, versionID)
}

func (s *endpointVersionService) GetActiveSnapshot(ctx context.Context, tenantID, endpointID int64) (*domain.EndpointVersion, error) {
	av, err := s.active.Get(ctx, tenantID, endpointID)
	if err != nil {
		return nil, err
	}
	return s.versions.GetByID(ctx, tenantID, av.VersionID)
}

func (s *endpointVersionService) ListActivationLog(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointActivationLog, int, error) {
	return s.log.ListByEndpoint(ctx, tenantID, endpointID, p)
}

func (s *endpointVersionService) DeleteVersion(ctx context.Context, tenantID, endpointID, versionID, actorID int64) error {
	v, err := s.versions.GetByID(ctx, tenantID, versionID)
	if err != nil {
		return err
	}
	if v.EndpointID != endpointID {
		return domain.ErrBadRequest("version does not belong to endpoint")
	}

	// Guard 1: can't delete the active version.
	if av, err := s.active.Get(ctx, tenantID, endpointID); err == nil && av != nil && av.VersionID == versionID {
		return domain.ErrConflict("cannot delete the currently active version; switch to another version first")
	}

	// Guard 2: can't delete the only remaining version.
	count, err := s.versions.CountByEndpoint(ctx, tenantID, endpointID)
	if err != nil {
		return err
	}
	if count <= 1 {
		return domain.ErrConflict("cannot delete the only remaining version")
	}

	if err := s.versions.Delete(ctx, tenantID, versionID); err != nil {
		return err
	}
	// Log entry stores both version_id (for ref) and version number (冗余，因为版本行马上被删了，version_id 之后会 JOIN 不出来)。
	if err := s.log.Append(ctx, tenantID, endpointID, versionID, v.Version, actorID, domain.ActivationActionVersionDelete); err != nil {
		slog.Warn("append delete-version log failed", "endpoint_id", endpointID, "version_id", versionID, "err", err)
	}
	return nil
}

func (s *endpointVersionService) RevertToActive(ctx context.Context, tenantID, endpointID, actorID int64) error {
	av, err := s.active.Get(ctx, tenantID, endpointID)
	if err != nil || av == nil {
		return domain.ErrBadRequest("接口未上线，没有可还原到的版本")
	}
	v, err := s.versions.GetByID(ctx, tenantID, av.VersionID)
	if err != nil {
		return err
	}
	if v.Snapshot == nil {
		return domain.ErrInternal("active version snapshot is missing")
	}
	// 注意：updated_at 故意写成 activated_at（不是 NOW），让 has_draft = (updated_at > activated_at) 自然评估成 false。
	if err := s.endpoints.RevertFromSnapshot(ctx, tenantID, endpointID, v.Snapshot, av.ActivatedAt); err != nil {
		return err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, av.VersionID, v.Version, actorID, domain.ActivationActionRevert); err != nil {
		slog.Warn("append revert log failed", "endpoint_id", endpointID, "err", err)
	}
	return nil
}

func (s *endpointVersionService) snapshotScript(ctx context.Context, tenantID, scriptID int64) *domain.ScriptSnapshot {
	if scriptID == 0 || s.scripts == nil {
		return nil
	}
	sc, err := s.scripts.GetByID(ctx, tenantID, scriptID)
	if err != nil || sc == nil {
		return nil
	}
	return &domain.ScriptSnapshot{ID: sc.ID, Name: sc.Name, Type: sc.Type, Code: sc.Code}
}

func (s *endpointVersionService) snapshotDataSourceRef(ctx context.Context, tenantID, dsID int64) *domain.DataSourceRef {
	if dsID == 0 || s.datasource == nil {
		return nil
	}
	ds, err := s.datasource.GetByID(ctx, tenantID, dsID)
	if err != nil || ds == nil {
		return nil
	}
	return &domain.DataSourceRef{ID: ds.ID, Name: ds.Name, Type: ds.Type}
}
