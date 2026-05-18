package service

import (
	"context"
	"regexp"
	"strings"

	"github.com/bulolo/owlapi/internal/domain"
)

// EnvironmentService is the single entry point for project environment + binding
// management. Both concepts live together because they share an invariant: bindings
// are scoped by env, so renaming/deleting an env cascades through bindings.
type EnvironmentService interface {
	// CreateInitial creates the default "prod" env for a brand-new project.
	// Idempotent — safe to call from project creation flow.
	CreateInitial(ctx context.Context, tenantID, projectID int64) (*domain.ProjectEnvironment, error)

	// Create adds a new env to a project. If copyFromEnvID != 0, the new env
	// inherits the alias list from the source env. If copyBindings is true,
	// the actual datasource_id bindings are also copied (otherwise aliases end
	// up unbound and must be filled by the user).
	Create(ctx context.Context, tenantID, projectID int64, name string, isDefault bool, copyFromEnvID int64, copyBindings bool) (*domain.ProjectEnvironment, error)

	List(ctx context.Context, tenantID, projectID int64) ([]*domain.ProjectEnvironment, error)
	GetByID(ctx context.Context, tenantID, id int64) (*domain.ProjectEnvironment, error)
	GetByName(ctx context.Context, tenantID, projectID int64, name string) (*domain.ProjectEnvironment, error)
	GetDefault(ctx context.Context, tenantID, projectID int64) (*domain.ProjectEnvironment, error)
	Rename(ctx context.Context, tenantID, envID int64, newName string) error
	SetDefault(ctx context.Context, tenantID, projectID, envID int64) error
	Delete(ctx context.Context, tenantID, envID int64) error

	// Bindings.
	ListBindings(ctx context.Context, tenantID, envID int64) ([]*domain.EndpointDatasourceBinding, error)
	ListBindingsByProject(ctx context.Context, tenantID, projectID int64) ([]*domain.EndpointDatasourceBinding, error)
	UpsertBinding(ctx context.Context, tenantID, envID int64, alias string, datasourceID int64) error
	DeleteBinding(ctx context.Context, tenantID, envID int64, alias string) error
	RenameAlias(ctx context.Context, tenantID, projectID int64, oldAlias, newAlias string) error
	// Resolve looks up which physical datasource a (env, alias) pair points to.
	Resolve(ctx context.Context, tenantID, envID int64, alias string) (*domain.DataSource, error)
}

type environmentService struct {
	envs     domain.ProjectEnvironmentRepository
	bindings domain.EndpointDatasourceBindingRepository
	active   domain.EndpointActiveVersionRepository
	dsRepo   domain.DataSourceRepository
}

func NewEnvironmentService(
	envs domain.ProjectEnvironmentRepository,
	bindings domain.EndpointDatasourceBindingRepository,
	active domain.EndpointActiveVersionRepository,
	dsRepo domain.DataSourceRepository,
) EnvironmentService {
	return &environmentService{envs: envs, bindings: bindings, active: active, dsRepo: dsRepo}
}

var envNamePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,19}$`)

// normalizeSlug trims + lowercases user input so callers like "STAGING" or
// " prod " don't fail validation; URLs and SQL columns assume lowercase anyway.
func normalizeSlug(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func validateEnvName(name string) error {
	if !envNamePattern.MatchString(name) {
		return domain.ErrBadRequest("环境名只能包含小写字母、数字和短横线，长度 1-20，且首字符为字母或数字")
	}
	return nil
}

func validateAlias(alias string) error {
	if !envNamePattern.MatchString(alias) {
		return domain.ErrBadRequest("别名只能包含小写字母、数字和短横线，长度 1-20，且首字符为字母或数字")
	}
	return nil
}

func (s *environmentService) CreateInitial(ctx context.Context, tenantID, projectID int64) (*domain.ProjectEnvironment, error) {
	if existing, err := s.envs.GetByName(ctx, tenantID, projectID, "prod"); err == nil && existing != nil {
		return existing, nil
	}
	env := &domain.ProjectEnvironment{
		TenantID:  tenantID,
		ProjectID: projectID,
		Name:      "prod",
		IsDefault: true,
	}
	if err := s.envs.Create(ctx, env); err != nil {
		return nil, err
	}
	return env, nil
}

func (s *environmentService) Create(ctx context.Context, tenantID, projectID int64, name string, isDefault bool, copyFromEnvID int64, copyBindings bool) (*domain.ProjectEnvironment, error) {
	name = normalizeSlug(name)
	if err := validateEnvName(name); err != nil {
		return nil, err
	}
	if existing, _ := s.envs.GetByName(ctx, tenantID, projectID, name); existing != nil {
		return nil, domain.ErrConflictf("environment '%s' already exists", name)
	}

	env := &domain.ProjectEnvironment{
		TenantID:  tenantID,
		ProjectID: projectID,
		Name:      name,
		IsDefault: isDefault,
	}
	if err := s.envs.Create(ctx, env); err != nil {
		return nil, err
	}

	if isDefault {
		if err := s.SetDefault(ctx, tenantID, projectID, env.ID); err != nil {
			return nil, err
		}
	}

	if copyFromEnvID > 0 {
		src, err := s.bindings.ListByEnv(ctx, tenantID, copyFromEnvID)
		if err != nil {
			return env, err
		}
		for _, b := range src {
			dsID := int64(0)
			if copyBindings {
				dsID = b.DataSourceID
			}
			if dsID == 0 {
				// "Empty" bindings: we still want the alias to exist in the new env
				// even without a datasource. But the binding table requires a real
				// datasource_id, so we skip creating a row here — the alias will
				// materialize the first time the user picks a datasource for it in
				// this env. The alias list is implicitly the union of bindings
				// across envs (the UI computes it from ListBindingsByProject).
				continue
			}
			if err := s.bindings.Upsert(ctx, &domain.EndpointDatasourceBinding{
				TenantID:     tenantID,
				EnvID:        env.ID,
				Alias:        b.Alias,
				DataSourceID: dsID,
			}); err != nil {
				return env, err
			}
		}
	}

	return env, nil
}

func (s *environmentService) List(ctx context.Context, tenantID, projectID int64) ([]*domain.ProjectEnvironment, error) {
	return s.envs.ListByProject(ctx, tenantID, projectID)
}

func (s *environmentService) GetByID(ctx context.Context, tenantID, id int64) (*domain.ProjectEnvironment, error) {
	return s.envs.GetByID(ctx, tenantID, id)
}

func (s *environmentService) GetByName(ctx context.Context, tenantID, projectID int64, name string) (*domain.ProjectEnvironment, error) {
	return s.envs.GetByName(ctx, tenantID, projectID, name)
}

func (s *environmentService) GetDefault(ctx context.Context, tenantID, projectID int64) (*domain.ProjectEnvironment, error) {
	return s.envs.GetDefault(ctx, tenantID, projectID)
}

func (s *environmentService) Rename(ctx context.Context, tenantID, envID int64, newName string) error {
	newName = normalizeSlug(newName)
	if err := validateEnvName(newName); err != nil {
		return err
	}
	env, err := s.envs.GetByID(ctx, tenantID, envID)
	if err != nil {
		return err
	}
	if env.Name == newName {
		return nil
	}
	if existing, _ := s.envs.GetByName(ctx, tenantID, env.ProjectID, newName); existing != nil {
		return domain.ErrConflictf("environment '%s' already exists", newName)
	}
	env.Name = newName
	return s.envs.Update(ctx, env)
}

func (s *environmentService) SetDefault(ctx context.Context, tenantID, projectID, envID int64) error {
	all, err := s.envs.ListByProject(ctx, tenantID, projectID)
	if err != nil {
		return err
	}
	for _, e := range all {
		want := e.ID == envID
		if e.IsDefault == want {
			continue
		}
		e.IsDefault = want
		if err := s.envs.Update(ctx, e); err != nil {
			return err
		}
	}
	return nil
}

func (s *environmentService) Delete(ctx context.Context, tenantID, envID int64) error {
	env, err := s.envs.GetByID(ctx, tenantID, envID)
	if err != nil {
		return err
	}
	if env.IsDefault {
		return domain.ErrConflict("默认环境不可删除")
	}
	if err := s.active.DeleteByEnv(ctx, tenantID, envID); err != nil {
		return err
	}
	if err := s.bindings.DeleteByEnv(ctx, tenantID, envID); err != nil {
		return err
	}
	return s.envs.Delete(ctx, tenantID, envID)
}

func (s *environmentService) ListBindings(ctx context.Context, tenantID, envID int64) ([]*domain.EndpointDatasourceBinding, error) {
	return s.bindings.ListByEnv(ctx, tenantID, envID)
}

func (s *environmentService) ListBindingsByProject(ctx context.Context, tenantID, projectID int64) ([]*domain.EndpointDatasourceBinding, error) {
	return s.bindings.ListByProject(ctx, tenantID, projectID)
}

func (s *environmentService) UpsertBinding(ctx context.Context, tenantID, envID int64, alias string, datasourceID int64) error {
	alias = normalizeSlug(alias)
	if err := validateAlias(alias); err != nil {
		return err
	}
	// Sanity check: the datasource belongs to this tenant.
	if _, err := s.dsRepo.GetByID(ctx, tenantID, datasourceID); err != nil {
		return domain.ErrBadRequest("datasource not found in this tenant")
	}
	return s.bindings.Upsert(ctx, &domain.EndpointDatasourceBinding{
		TenantID:     tenantID,
		EnvID:        envID,
		Alias:        alias,
		DataSourceID: datasourceID,
	})
}

func (s *environmentService) DeleteBinding(ctx context.Context, tenantID, envID int64, alias string) error {
	return s.bindings.Delete(ctx, tenantID, envID, alias)
}

func (s *environmentService) RenameAlias(ctx context.Context, tenantID, projectID int64, oldAlias, newAlias string) error {
	oldAlias = normalizeSlug(oldAlias)
	newAlias = normalizeSlug(newAlias)
	if err := validateAlias(newAlias); err != nil {
		return err
	}
	return s.bindings.RenameAlias(ctx, tenantID, projectID, oldAlias, newAlias)
}

func (s *environmentService) Resolve(ctx context.Context, tenantID, envID int64, alias string) (*domain.DataSource, error) {
	b, err := s.bindings.Get(ctx, tenantID, envID, alias)
	if err != nil {
		return nil, domain.ErrNotFoundf("alias '%s' not bound in env %d", alias, envID)
	}
	return s.dsRepo.GetByID(ctx, tenantID, b.DataSourceID)
}
