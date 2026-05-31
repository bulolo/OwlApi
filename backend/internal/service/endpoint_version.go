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
//	endpoint_active_version = (endpoint, env) → version pointer; each env tracks
//	                          its own live version. dev=v5, prod=v3 is valid state.
//
// "Publish" is sugar for "CreateVersion + Activate in env". "Promote" is just
// "Activate in target env without creating a new version".
type EndpointVersionService interface {
	// CreateVersion freezes the current api_endpoints row into an immutable version.
	// Does NOT change what's live in any env.
	CreateVersion(ctx context.Context, tenantID, endpointID, actorID int64, note string, maxVersions int) (*domain.EndpointVersion, error)

	// Activate flips endpoint_active_version for the given env to point at the given version.
	// If older than the current, recorded as "rollback"; otherwise "activate".
	Activate(ctx context.Context, tenantID, endpointID, envID, versionID, actorID int64) error

	// Publish = CreateVersion + Activate in env, the default UX path.
	Publish(ctx context.Context, tenantID, endpointID, envID, actorID int64, note string, maxVersions int) (*domain.EndpointVersion, error)

	// Promote activates whichever version is currently active in sourceEnvID into targetEnvID.
	// No new version row is created. Recorded as "promote" in the activation log.
	Promote(ctx context.Context, tenantID, endpointID, sourceEnvID, targetEnvID, actorID int64) error

	// PublishToEnv activates an already-existing version in a new env and records it as
	// "publish" in the activation log. Used when the same version needs to go live in
	// multiple envs simultaneously (e.g. seed data: create v1 once, publish to dev + prod).
	PublishToEnv(ctx context.Context, tenantID, endpointID, envID, versionID int64, version int, actorID int64) error

	// Unpublish clears the active pointer for one env. Versions remain in history.
	Unpublish(ctx context.Context, tenantID, endpointID, envID, actorID int64) error

	ListVersions(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointVersion, int, error)
	GetVersion(ctx context.Context, tenantID, versionID int64) (*domain.EndpointVersion, error)

	// GetActiveSnapshot resolves the live version for a request: caller already
	// determined the env from the URL.
	GetActiveSnapshot(ctx context.Context, tenantID, endpointID, envID int64) (*domain.EndpointVersion, error)

	// ListActiveByEndpoint returns the per-env active pointers for an endpoint
	// (used by UI to show "v5 in dev, v3 in prod" badges).
	ListActiveByEndpoint(ctx context.Context, tenantID, endpointID int64) ([]*domain.EndpointActiveVersion, error)

	ListActivationLog(ctx context.Context, tenantID, endpointID int64, p domain.ListParams) ([]*domain.EndpointActivationLog, int, error)

	// DeleteVersion removes a version. Guard rails: cannot delete an active version
	// in any env; cannot delete the only remaining version.
	DeleteVersion(ctx context.Context, tenantID, endpointID, versionID, actorID int64) error

	// RevertToActive 丢弃所有未发布的修改，把 api_endpoints 草稿恢复到指定 env 的当前激活版本。
	// updated_at 显式写为 activated_at，让 derived 字段 has_draft 立刻变 false。
	RevertToActive(ctx context.Context, tenantID, endpointID, envID, actorID int64) error
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
		TenantID:            tenantID,
		EndpointID:          endpointID,
		Version:             version,
		Snapshot:            ep,
		SnapshotV:           1,
		PreScriptSnapshots:  s.snapshotChain(ctx, tenantID, ep.PreScripts),
		PostScriptSnapshots: s.snapshotChain(ctx, tenantID, ep.PostScripts),
		DataSourceRef:       &domain.DataSourceRef{Alias: ep.DataSourceAlias},
		Note:                note,
		CreatedBy:           actorID,
	}
	if err := s.versions.Create(ctx, v); err != nil {
		return nil, err
	}
	if err := s.versions.Trim(ctx, tenantID, endpointID, maxVersions); err != nil {
		slog.Warn("trim old versions failed", "endpoint_id", endpointID, "err", err)
	}
	if err := s.log.Append(ctx, tenantID, endpointID, 0, v.ID, v.Version, actorID, domain.ActivationActionVersionCreate); err != nil {
		slog.Warn("append version_create log failed", "endpoint_id", endpointID, "err", err)
	}
	return v, nil
}

func (s *endpointVersionService) Activate(ctx context.Context, tenantID, endpointID, envID, versionID, actorID int64) error {
	target, err := s.versions.GetByID(ctx, tenantID, versionID)
	if err != nil {
		return err
	}
	if target.EndpointID != endpointID {
		return errors.New("version does not belong to endpoint")
	}

	action := domain.ActivationActionActivate
	current, err := s.active.Get(ctx, tenantID, endpointID, envID)
	if err == nil && current != nil && current.Version > target.Version {
		action = domain.ActivationActionRollback
	}

	if err := s.active.Upsert(ctx, tenantID, endpointID, envID, versionID, actorID); err != nil {
		return err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, envID, versionID, target.Version, actorID, action); err != nil {
		slog.Warn("append activation log failed", "endpoint_id", endpointID, "err", err)
	}
	return nil
}

func (s *endpointVersionService) Publish(ctx context.Context, tenantID, endpointID, envID, actorID int64, note string, maxVersions int) (*domain.EndpointVersion, error) {
	// 每次 Publish 都创建一个新的版本快照——即使草稿和上一版本一字不差。
	// 用户偏好：每次发版操作 = 一条版本记录，便于审计与回滚锚点。
	// 想要"复用已有版本激活到另一个 env"用 Promote。
	v, err := s.CreateVersion(ctx, tenantID, endpointID, actorID, note, maxVersions)
	if err != nil {
		return nil, err
	}
	if err := s.active.Upsert(ctx, tenantID, endpointID, envID, v.ID, actorID); err != nil {
		return nil, err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, envID, v.ID, v.Version, actorID, domain.ActivationActionPublish); err != nil {
		slog.Warn("append activation log failed", "endpoint_id", endpointID, "err", err)
	}
	v.IsActive = true
	return v, nil
}

func (s *endpointVersionService) PublishToEnv(ctx context.Context, tenantID, endpointID, envID, versionID int64, version int, actorID int64) error {
	if err := s.active.Upsert(ctx, tenantID, endpointID, envID, versionID, actorID); err != nil {
		return err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, envID, versionID, version, actorID, domain.ActivationActionPublish); err != nil {
		slog.Warn("append activation log failed", "endpoint_id", endpointID, "err", err)
	}
	return nil
}

func (s *endpointVersionService) Promote(ctx context.Context, tenantID, endpointID, sourceEnvID, targetEnvID, actorID int64) error {
	if sourceEnvID == targetEnvID {
		return domain.ErrBadRequest("source and target env must differ")
	}
	src, err := s.active.Get(ctx, tenantID, endpointID, sourceEnvID)
	if err != nil || src == nil {
		return domain.ErrBadRequest("source env has no active version to promote")
	}
	if err := s.active.Upsert(ctx, tenantID, endpointID, targetEnvID, src.VersionID, actorID); err != nil {
		return err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, targetEnvID, src.VersionID, src.Version, actorID, domain.ActivationActionPromote); err != nil {
		slog.Warn("append promote log failed", "endpoint_id", endpointID, "err", err)
	}
	return nil
}

func (s *endpointVersionService) Unpublish(ctx context.Context, tenantID, endpointID, envID, actorID int64) error {
	if err := s.active.Delete(ctx, tenantID, endpointID, envID); err != nil {
		return err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, envID, 0, 0, actorID, domain.ActivationActionUnpublish); err != nil {
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

func (s *endpointVersionService) GetActiveSnapshot(ctx context.Context, tenantID, endpointID, envID int64) (*domain.EndpointVersion, error) {
	av, err := s.active.Get(ctx, tenantID, endpointID, envID)
	if err != nil {
		return nil, err
	}
	return s.versions.GetByID(ctx, tenantID, av.VersionID)
}

func (s *endpointVersionService) ListActiveByEndpoint(ctx context.Context, tenantID, endpointID int64) ([]*domain.EndpointActiveVersion, error) {
	return s.active.ListByEndpoint(ctx, tenantID, endpointID)
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

	// 唯一的硬约束：在任何 env 还激活的版本不允许删，否则线上调用立刻就 500。
	// 至于"是否是最后一个版本"无所谓——草稿一直在，用户随时可以再"创建版本"补回。
	actives, err := s.active.ListByEndpoint(ctx, tenantID, endpointID)
	if err == nil {
		for _, av := range actives {
			if av.VersionID == versionID {
				return domain.ErrConflict("cannot delete a version that is active in some environment")
			}
		}
	}

	if err := s.versions.Delete(ctx, tenantID, versionID); err != nil {
		return err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, 0, versionID, v.Version, actorID, domain.ActivationActionVersionDelete); err != nil {
		slog.Warn("append delete-version log failed", "endpoint_id", endpointID, "version_id", versionID, "err", err)
	}
	return nil
}

func (s *endpointVersionService) RevertToActive(ctx context.Context, tenantID, endpointID, envID, actorID int64) error {
	av, err := s.active.Get(ctx, tenantID, endpointID, envID)
	if err != nil || av == nil {
		return domain.ErrBadRequest("接口在该环境未上线，没有可还原到的版本")
	}
	v, err := s.versions.GetByID(ctx, tenantID, av.VersionID)
	if err != nil {
		return err
	}
	if v.Snapshot == nil {
		return domain.ErrInternal("active version snapshot is missing")
	}
	if err := s.endpoints.RevertFromSnapshot(ctx, tenantID, endpointID, v.Snapshot, av.ActivatedAt); err != nil {
		return err
	}
	if err := s.log.Append(ctx, tenantID, endpointID, envID, av.VersionID, v.Version, actorID, domain.ActivationActionRevert); err != nil {
		slog.Warn("append revert log failed", "endpoint_id", endpointID, "err", err)
	}
	return nil
}

// snapshotChain freezes an ordered chain into resolved {name,code} snapshots,
// preserving order. Inline steps snapshot their own code; library steps resolve
// the current library code (skipped if they fail to resolve).
func (s *endpointVersionService) snapshotChain(ctx context.Context, tenantID int64, steps []domain.ScriptStep) []domain.ScriptSnapshot {
	var snaps []domain.ScriptSnapshot
	for _, step := range steps {
		switch step.Source {
		case domain.ScriptStepInline:
			snaps = append(snaps, domain.ScriptSnapshot{Name: step.Name, Code: step.Code})
		case domain.ScriptStepLibrary:
			if step.ScriptID == 0 || s.scripts == nil {
				continue
			}
			sc, err := s.scripts.GetByID(ctx, tenantID, step.ScriptID)
			if err != nil || sc == nil {
				continue
			}
			snaps = append(snaps, domain.ScriptSnapshot{ID: sc.ID, Name: sc.Name, Type: sc.Type, Code: sc.Code})
		}
	}
	return snaps
}
