package domain

import (
	"context"
	"time"
)

// ListParams holds common pagination and search parameters for list queries.
type ListParams struct {
	Page    int
	Size    int // 0 means no limit (is_pager=0)
	Keyword string
}

// Offset returns the SQL offset value.
func (p ListParams) Offset() int {
	return (p.Page - 1) * p.Size
}

// IsPaged returns true if pagination is enabled.
func (p ListParams) IsPaged() bool {
	return p.Size > 0
}

type TenantRepository interface {
	Create(ctx context.Context, tenant *Tenant) error
	GetByID(ctx context.Context, id int64) (*Tenant, error)
	GetBySlug(ctx context.Context, slug string) (*Tenant, error)
	List(ctx context.Context, p ListParams) ([]*Tenant, int, error)
	ListByIDs(ctx context.Context, ids []int64, p ListParams) ([]*Tenant, int, error)
	Update(ctx context.Context, tenant *Tenant) error
	Delete(ctx context.Context, id int64) error
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id int64) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	UpdatePasswordHash(ctx context.Context, userID int64, hash string) error
}

type TenantUserRepository interface {
	Create(ctx context.Context, tu *TenantUser) error
	Delete(ctx context.Context, tenantID, userID int64) error
	List(ctx context.Context, tenantID int64, p ListParams) ([]*TenantUser, int, error)
	GetByUserID(ctx context.Context, userID int64) ([]*TenantUser, error)
	GetByTenantAndUser(ctx context.Context, tenantID, userID int64) (*TenantUser, error)
	UpdateRole(ctx context.Context, tenantID, userID int64, role UserRole) error
}

type GatewayRepository interface {
	Create(ctx context.Context, gw *Gateway) error
	GetByID(ctx context.Context, tenantID, id int64) (*Gateway, error)
	GetByToken(ctx context.Context, token string) (*Gateway, error)
	List(ctx context.Context, tenantID int64, p ListParams) ([]*Gateway, int, error)
	Delete(ctx context.Context, tenantID, id int64) error
	UpdateStatus(ctx context.Context, id int64, status GatewayStatus, ip string) error
}

type DataSourceRepository interface {
	Create(ctx context.Context, ds *DataSource) error
	GetByID(ctx context.Context, tenantID, id int64) (*DataSource, error)
	GetByName(ctx context.Context, tenantID int64, name string) (*DataSource, error)
	List(ctx context.Context, tenantID int64, p ListParams) ([]*DataSource, int, error)
	Delete(ctx context.Context, tenantID, id int64) error
	Update(ctx context.Context, ds *DataSource) error
	GetEnv(ctx context.Context, tenantID, datasourceID int64, env string) (*DataSourceEnv, error)
}

type ProjectRepository interface {
	GetByID(ctx context.Context, tenantID, id int64) (*Project, error)
	GetByName(ctx context.Context, tenantID int64, name string) (*Project, error)
	GetBySlug(ctx context.Context, tenantID int64, slug string) (*Project, error)
	Create(ctx context.Context, p *Project) error
	List(ctx context.Context, tenantID int64, p ListParams) ([]*Project, int, error)
	Update(ctx context.Context, p *Project) error
	Delete(ctx context.Context, tenantID, id int64) error
}

type APIGroupRepository interface {
	Create(ctx context.Context, g *APIGroup) error
	Update(ctx context.Context, g *APIGroup) error
	Delete(ctx context.Context, tenantID, id int64) error
	List(ctx context.Context, tenantID, projectID int64, p ListParams) ([]*APIGroup, int, error)
	GetByID(ctx context.Context, tenantID, id int64) (*APIGroup, error)
	GetByName(ctx context.Context, tenantID, projectID int64, name string) (*APIGroup, error)
}

type APIEndpointRepository interface {
	GetByPath(ctx context.Context, tenantID int64, path string) (*APIEndpoint, error)
	GetByPathAndMethod(ctx context.Context, tenantID, projectID int64, path, method string) (*APIEndpoint, error)
	GetByID(ctx context.Context, tenantID, id int64) (*APIEndpoint, error)
	Create(ctx context.Context, ep *APIEndpoint) error
	Update(ctx context.Context, ep *APIEndpoint) error
	// RevertFromSnapshot rewrites api_endpoints from a version snapshot and explicitly sets
	// updated_at = activatedAt so the derived has_draft becomes false.
	// (Regular Update bumps updated_at = NOW(), which would still leave has_draft = true.)
	RevertFromSnapshot(ctx context.Context, tenantID, endpointID int64, snap *APIEndpoint, activatedAt time.Time) error
	List(ctx context.Context, tenantID, projectID int64, p ListParams) ([]*APIEndpoint, int, error)
	// ListPublishedByProject returns endpoints whose endpoint_active_version row exists in the given project.
	ListPublishedByProject(ctx context.Context, tenantID, projectID int64) ([]*APIEndpoint, error)
	Delete(ctx context.Context, tenantID, id int64) error
}

type EndpointVersionRepository interface {
	// Create inserts a new immutable version. Caller must populate Version (use NextVersion).
	Create(ctx context.Context, v *EndpointVersion) error
	GetByID(ctx context.Context, tenantID, id int64) (*EndpointVersion, error)
	GetByVersion(ctx context.Context, tenantID, endpointID int64, version int) (*EndpointVersion, error)
	ListByEndpoint(ctx context.Context, tenantID, endpointID int64, p ListParams) ([]*EndpointVersion, int, error)
	// NextVersion returns MAX(version) + 1 for the endpoint (1 if none exist).
	NextVersion(ctx context.Context, tenantID, endpointID int64) (int, error)
	// CountByEndpoint returns how many version rows exist for this endpoint.
	CountByEndpoint(ctx context.Context, tenantID, endpointID int64) (int, error)
	// Trim deletes old versions beyond keepCount, skipping the currently active one. keepCount <= 0 → no-op.
	Trim(ctx context.Context, tenantID, endpointID int64, keepCount int) error
	// DeleteByEndpoint removes all versions for an endpoint (used when endpoint itself is deleted).
	DeleteByEndpoint(ctx context.Context, tenantID, endpointID int64) error
	// Delete removes a single version row by ID. Caller is responsible for the active/only-version guard rails.
	Delete(ctx context.Context, tenantID, id int64) error
}

type EndpointActiveVersionRepository interface {
	// Upsert replaces the active version pointer for (tenant, endpoint).
	Upsert(ctx context.Context, tenantID, endpointID, versionID, actorID int64) error
	Get(ctx context.Context, tenantID, endpointID int64) (*EndpointActiveVersion, error)
	// Delete clears the active version pointer (= take endpoint offline).
	Delete(ctx context.Context, tenantID, endpointID int64) error
	// ListByProject returns active pointers for all published endpoints of a project, joined with version numbers.
	ListByProject(ctx context.Context, tenantID, projectID int64) ([]*EndpointActiveVersion, error)
}

type EndpointCallLogRepository interface {
	// Append writes one call log row. Fire-and-forget at the service layer.
	Append(ctx context.Context, log *EndpointCallLog) error
	// ListByEndpoint paginates call logs filtered by status class / keyword / since.
	ListByEndpoint(ctx context.Context, tenantID, endpointID int64, f CallLogFilter, p ListParams) ([]*EndpointCallLog, int, error)
}

type EndpointActivationLogRepository interface {
	// Append writes one log row. versionNumber is the human-readable v3 number;
	// stored redundantly so the log still displays correctly after the version row is deleted.
	// Pass 0 for both versionID and versionNumber on unpublish-style events with no associated version.
	Append(ctx context.Context, tenantID, endpointID, versionID int64, versionNumber int, actorID int64, action ActivationAction) error
	ListByEndpoint(ctx context.Context, tenantID, endpointID int64, p ListParams) ([]*EndpointActivationLog, int, error)
}

type PlatformSettingsRepository interface {
	Get(ctx context.Context) (*PlatformSettings, error)
	Update(ctx context.Context, s *PlatformSettings) error
}

type ScriptRepository interface {
	Create(ctx context.Context, s *Script) error
	Update(ctx context.Context, s *Script) error
	GetByID(ctx context.Context, tenantID, id int64) (*Script, error)
	GetByName(ctx context.Context, tenantID int64, name string) (*Script, error)
	List(ctx context.Context, tenantID int64, p ListParams) ([]*Script, int, error)
	Delete(ctx context.Context, tenantID, id int64) error
}
