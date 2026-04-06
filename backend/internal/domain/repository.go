package domain

import "context"

type TenantRepository interface {
	Create(ctx context.Context, tenant *Tenant) error
	GetByID(ctx context.Context, id int64) (*Tenant, error)
	GetBySlug(ctx context.Context, slug string) (*Tenant, error)
	List(ctx context.Context, page, size int) ([]*Tenant, int, error)
	Update(ctx context.Context, tenant *Tenant) error
	Delete(ctx context.Context, id int64) error
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id int64) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
}

type TenantUserRepository interface {
	Create(ctx context.Context, tu *TenantUser) error
	Delete(ctx context.Context, tenantID, userID int64) error
	List(ctx context.Context, tenantID int64, page, size int) ([]*TenantUser, int, error)
	GetByUserID(ctx context.Context, userID int64) ([]*TenantUser, error)
	GetByTenantAndUser(ctx context.Context, tenantID, userID int64) (*TenantUser, error)
	UpdateRole(ctx context.Context, tenantID, userID int64, role UserRole) error
}

type GatewayRepository interface {
	Create(ctx context.Context, gw *Gateway) error
	GetByID(ctx context.Context, tenantID, id int64) (*Gateway, error)
	List(ctx context.Context, tenantID int64) ([]*Gateway, error)
	Delete(ctx context.Context, tenantID, id int64) error
	UpdateStatus(ctx context.Context, tenantID, id int64, status GatewayStatus, ip string) error
}

type DataSourceRepository interface {
	CreateDataSource(ctx context.Context, ds *DataSource) error
	GetDataSourceByID(ctx context.Context, tenantID, id int64) (*DataSource, error)
	GetDataSourceByName(ctx context.Context, tenantID int64, name string) (*DataSource, error)
	ListDataSources(ctx context.Context, tenantID int64) ([]*DataSource, error)
	DeleteDataSource(ctx context.Context, tenantID, id int64) error
	UpdateDataSource(ctx context.Context, ds *DataSource) error
	// Resolve datasource env for query execution
	GetDataSourceEnv(ctx context.Context, datasourceID int64, env string) (*DataSourceEnv, error)
}

type ProjectRepository interface {
	GetProjectByID(ctx context.Context, tenantID, id int64) (*Project, error)
	GetProjectByName(ctx context.Context, tenantID int64, name string) (*Project, error)
	CreateProject(ctx context.Context, p *Project) error
	ListProjects(ctx context.Context, tenantID int64) ([]*Project, error)
	UpdateProject(ctx context.Context, p *Project) error
	DeleteProject(ctx context.Context, tenantID, id int64) error
}

type APIGroupRepository interface {
	CreateAPIGroup(ctx context.Context, g *APIGroup) error
	UpdateAPIGroup(ctx context.Context, g *APIGroup) error
	DeleteAPIGroup(ctx context.Context, tenantID, id int64) error
	ListAPIGroups(ctx context.Context, tenantID, projectID int64) ([]*APIGroup, error)
	GetAPIGroupByID(ctx context.Context, tenantID, id int64) (*APIGroup, error)
	GetAPIGroupByName(ctx context.Context, tenantID, projectID int64, name string) (*APIGroup, error)
}

type APIEndpointRepository interface {
	GetAPIEndpointByPath(ctx context.Context, tenantID int64, path string) (*APIEndpoint, error)
	GetAPIEndpointByID(ctx context.Context, tenantID, id int64) (*APIEndpoint, error)
	CreateAPIEndpoint(ctx context.Context, ep *APIEndpoint) error
	UpdateAPIEndpoint(ctx context.Context, ep *APIEndpoint) error
	ListAPIEndpoints(ctx context.Context, tenantID, projectID int64) ([]*APIEndpoint, error)
	DeleteAPIEndpoint(ctx context.Context, tenantID, id int64) error
}

type ScriptRepository interface {
	CreateScript(ctx context.Context, s *Script) error
	UpdateScript(ctx context.Context, s *Script) error
	GetScriptByID(ctx context.Context, tenantID, id int64) (*Script, error)
	GetScriptByName(ctx context.Context, tenantID int64, name string) (*Script, error)
	ListScripts(ctx context.Context, tenantID int64) ([]*Script, error)
	DeleteScript(ctx context.Context, tenantID, id int64) error
}

