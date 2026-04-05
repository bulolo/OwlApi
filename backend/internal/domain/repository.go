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

type ProjectRepository interface {
	CreateDataSource(ctx context.Context, ds *DataSource) error
	GetDataSourceByID(ctx context.Context, tenantID, id int64) (*DataSource, error)
	ListDataSources(ctx context.Context, tenantID int64) ([]*DataSource, error)
	DeleteDataSource(ctx context.Context, tenantID, id int64) error
	UpdateDataSource(ctx context.Context, ds *DataSource) error
	GetProjectByID(ctx context.Context, tenantID, id int64) (*Project, error)
	CreateProject(ctx context.Context, p *Project) error
	ListProjects(ctx context.Context, tenantID int64) ([]*Project, error)
	UpdateProject(ctx context.Context, p *Project) error
	DeleteProject(ctx context.Context, tenantID, id int64) error
	GetAPIEndpointByPath(ctx context.Context, tenantID int64, path string) (*APIEndpoint, error)
	CreateAPIEndpoint(ctx context.Context, ep *APIEndpoint) error
	ListAPIEndpoints(ctx context.Context, tenantID, projectID int64) ([]*APIEndpoint, error)
	DeleteAPIEndpoint(ctx context.Context, tenantID, id int64) error
	// Resolve datasource env for query execution
	GetDataSourceEnv(ctx context.Context, datasourceID int64, env string) (*DataSourceEnv, error)
}
