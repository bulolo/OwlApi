package http

import (
	"github.com/gin-gonic/gin"
	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/service"
)

// App holds all wired dependencies for the HTTP layer.
type App struct {
	Auth        service.AuthService
	Tenant      service.TenantService
	TenantUser  service.TenantUserService
	Gateway     service.GatewayService
	DataSource  service.DataSourceService
	Project     service.ProjectService
	Endpoint    service.APIEndpointService
	Group       service.APIGroupService
	Script      service.ScriptService
	Query       service.QueryService
	// repos needed only by middleware
	TenantRepo     domain.TenantRepository
	TenantUserRepo domain.TenantUserRepository
}

// RegisterRoutes wires all HTTP handlers and middleware to the gin engine.
func (a *App) RegisterRoutes(r *gin.Engine) {
	authH      := &AuthHandler{auth: a.Auth}
	tenantH    := &TenantHandler{tenants: a.Tenant}
	tuH        := &TenantUserHandler{tenantUsers: a.TenantUser}
	gatewayH   := &GatewayHandler{gateways: a.Gateway}
	dsH        := &DataSourceHandler{dataSources: a.DataSource}
	projectH   := &ProjectHandler{projects: a.Project}
	endpointH  := &APIEndpointHandler{endpoints: a.Endpoint}
	groupH     := &APIGroupHandler{groups: a.Group}
	scriptH    := &ScriptHandler{scripts: a.Script}
	queryH     := NewQueryHandler(a.Query, a.Endpoint, a.Tenant)
	queryTestH := &QueryTestHandler{tenants: a.Tenant, gateways: a.Gateway, queries: a.Query, endpoints: a.Endpoint, dataSources: a.DataSource}
	openAPIH   := &OpenAPIHandler{projects: a.Project, endpoints: a.Endpoint, groups: a.Group}

	v1 := r.Group("/v1")
	v1.POST("/auth/register", authH.HandleRegister)
	v1.POST("/auth/login", authH.HandleLogin)
	v1.GET("/my/tenants", JWTAuth(), tenantH.HandleMyTenants)
	v1.POST("/tenants/:slug/query/test", JWTAuth(), RequireTenantRole(a.TenantRepo, a.TenantUserRepo, domain.RoleViewer), queryTestH.HandleTestQuery)

	sa := v1.Group("", JWTAuth(), RequireSuperAdmin())
	sa.GET("/tenants", tenantH.HandleListTenants)
	sa.POST("/tenants", tenantH.HandleCreateTenant)
	sa.PUT("/tenants/:slug", tenantH.HandleUpdateTenant)
	sa.DELETE("/tenants/:slug", tenantH.HandleDeleteTenant)

	viewer := v1.Group("", JWTAuth(), RequireTenantRole(a.TenantRepo, a.TenantUserRepo, domain.RoleViewer))
	viewer.GET("/tenants/:slug", tenantH.HandleGetTenant)
	viewer.GET("/tenants/:slug/users", tuH.HandleList)
	viewer.GET("/tenants/:slug/gateways", gatewayH.HandleList)
	viewer.GET("/tenants/:slug/gateways/:gatewayId", gatewayH.HandleGet)
	viewer.GET("/tenants/:slug/datasources", dsH.HandleList)
	viewer.GET("/tenants/:slug/datasources/:datasourceId", dsH.HandleGet)
	viewer.GET("/tenants/:slug/projects", projectH.HandleList)
	viewer.GET("/tenants/:slug/projects/:projectId", projectH.HandleGet)
	viewer.GET("/tenants/:slug/projects/:projectId/endpoints", endpointH.HandleList)
	viewer.GET("/tenants/:slug/projects/:projectId/groups", groupH.HandleList)
	viewer.GET("/tenants/:slug/projects/:projectId/openapi.json", openAPIH.HandleExportOpenAPI)
	viewer.GET("/tenants/:slug/scripts", scriptH.HandleList)

	admin := v1.Group("", JWTAuth(), RequireTenantRole(a.TenantRepo, a.TenantUserRepo, domain.RoleAdmin))
	admin.POST("/tenants/:slug/users", tuH.HandleCreate)
	admin.PUT("/tenants/:slug/users/:userId/role", tuH.HandleUpdateRole)
	admin.DELETE("/tenants/:slug/users/:userId", tuH.HandleDelete)
	admin.POST("/tenants/:slug/gateways", gatewayH.HandleCreate)
	admin.DELETE("/tenants/:slug/gateways/:gatewayId", gatewayH.HandleDelete)
	admin.POST("/tenants/:slug/datasources", dsH.HandleCreate)
	admin.PUT("/tenants/:slug/datasources/:datasourceId", dsH.HandleUpdate)
	admin.DELETE("/tenants/:slug/datasources/:datasourceId", dsH.HandleDelete)
	admin.POST("/tenants/:slug/projects", projectH.HandleCreate)
	admin.PUT("/tenants/:slug/projects/:projectId", projectH.HandleUpdate)
	admin.DELETE("/tenants/:slug/projects/:projectId", projectH.HandleDelete)
	admin.POST("/tenants/:slug/projects/:projectId/endpoints", endpointH.HandleCreate)
	admin.PUT("/tenants/:slug/projects/:projectId/endpoints/:endpointId", endpointH.HandleUpdate)
	admin.DELETE("/tenants/:slug/projects/:projectId/endpoints/:endpointId", endpointH.HandleDelete)
	admin.POST("/tenants/:slug/projects/:projectId/groups", groupH.HandleCreate)
	admin.PUT("/tenants/:slug/projects/:projectId/groups/:groupId", groupH.HandleUpdate)
	admin.DELETE("/tenants/:slug/projects/:projectId/groups/:groupId", groupH.HandleDelete)
	admin.POST("/tenants/:slug/scripts", scriptH.HandleCreate)
	admin.PUT("/tenants/:slug/scripts/:scriptId", scriptH.HandleUpdate)
	admin.DELETE("/tenants/:slug/scripts/:scriptId", scriptH.HandleDelete)

	queryH.RegisterRoutes(r)
}
