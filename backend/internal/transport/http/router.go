package http

import (
	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/service"
)

// RegisterRoutes wires all HTTP handlers and middleware to the gin engine.
func RegisterRoutes(
	r *gin.Engine,
	authSvc service.AuthService,
	tenantSvc service.TenantService,
	tenantUserSvc service.TenantUserService,
	gatewaySvc service.GatewayService,
	querySvc service.QueryService,
	projectRepo domain.ProjectRepository,
	dsRepo domain.DataSourceRepository,
	endpointRepo domain.APIEndpointRepository,
	groupRepo domain.APIGroupRepository,
	scriptRepo domain.ScriptRepository,
	tenantRepo domain.TenantRepository,
	tenantUserRepo domain.TenantUserRepository,
) {
	auth := &AuthHandler{auth: authSvc}
	tenant := &TenantHandler{tenants: tenantSvc}
	tenantUser := &TenantUserHandler{tenants: tenantSvc, tenantUsers: tenantUserSvc}
	gateway := &GatewayHandler{gateways: gatewaySvc, tenants: tenantSvc}
	datasource := &DataSourceHandler{tenants: tenantSvc, repo: dsRepo}
	project := &ProjectHandler{tenants: tenantSvc, repo: projectRepo}
	queryHandler := NewQueryHandler(querySvc, endpointRepo)
	apiEndpoint := &APIEndpointHandler{tenants: tenantSvc, repo: endpointRepo}
	apiGroup := &APIGroupHandler{tenants: tenantSvc, repo: groupRepo}
	scriptHandler := &ScriptHandler{tenants: tenantSvc, repo: scriptRepo}
	queryTest := &QueryTestHandler{tenants: tenantSvc, gateways: gatewaySvc, queries: querySvc, endpointRepo: endpointRepo, dsRepo: dsRepo}

	// Public
	r.POST("/api/v1/auth/register", auth.HandleRegister)
	r.POST("/api/v1/auth/login", auth.HandleLogin)

	// Authenticated
	authed := r.Group("", JWTAuth())
	authed.GET("/api/v1/my/tenants", tenant.HandleMyTenants)

	// SuperAdmin only
	sa := authed.Group("", RequireSuperAdmin())
	sa.GET("/api/v1/tenants", tenant.HandleListTenants)
	sa.POST("/api/v1/tenants", tenant.HandleCreateTenant)
	sa.PUT("/api/v1/tenants/:slug", tenant.HandleUpdateTenant)
	sa.DELETE("/api/v1/tenants/:slug", tenant.HandleDeleteTenant)

	// Tenant Viewer+
	viewer := authed.Group("", RequireTenantRole(tenantRepo, tenantUserRepo, domain.RoleViewer))
	viewer.GET("/api/v1/tenants/:slug", tenant.HandleGetTenant)
	viewer.GET("/api/v1/tenants/:slug/users", tenantUser.HandleList)

	// Tenant Admin+
	admin := authed.Group("", RequireTenantRole(tenantRepo, tenantUserRepo, domain.RoleAdmin))
	admin.POST("/api/v1/tenants/:slug/users", tenantUser.HandleCreate)
	admin.PUT("/api/v1/tenants/:slug/users/:userId/role", tenantUser.HandleUpdateRole)
	admin.DELETE("/api/v1/tenants/:slug/users/:userId", tenantUser.HandleDelete)

	// Gateway management — Viewer can list/get, Admin can create/delete
	viewer.GET("/api/v1/tenants/:slug/gateways", gateway.HandleList)
	viewer.GET("/api/v1/tenants/:slug/gateways/:gatewayId", gateway.HandleGet)
	admin.POST("/api/v1/tenants/:slug/gateways", gateway.HandleCreate)
	admin.DELETE("/api/v1/tenants/:slug/gateways/:gatewayId", gateway.HandleDelete)

	// DataSource management — Viewer can list/get, Admin can create/delete
	viewer.GET("/api/v1/tenants/:slug/datasources", datasource.HandleList)
	viewer.GET("/api/v1/tenants/:slug/datasources/:datasourceId", datasource.HandleGet)
	admin.POST("/api/v1/tenants/:slug/datasources", datasource.HandleCreate)
	admin.PUT("/api/v1/tenants/:slug/datasources/:datasourceId", datasource.HandleUpdate)
	admin.DELETE("/api/v1/tenants/:slug/datasources/:datasourceId", datasource.HandleDelete)

	// Project management
	viewer.GET("/api/v1/tenants/:slug/projects", project.HandleList)
	viewer.GET("/api/v1/tenants/:slug/projects/:projectId", project.HandleGet)
	admin.POST("/api/v1/tenants/:slug/projects", project.HandleCreate)
	admin.PUT("/api/v1/tenants/:slug/projects/:projectId", project.HandleUpdate)
	admin.DELETE("/api/v1/tenants/:slug/projects/:projectId", project.HandleDelete)

	// API Endpoint management
	viewer.GET("/api/v1/tenants/:slug/projects/:projectId/endpoints", apiEndpoint.HandleList)
	admin.POST("/api/v1/tenants/:slug/projects/:projectId/endpoints", apiEndpoint.HandleCreate)
	admin.PUT("/api/v1/tenants/:slug/projects/:projectId/endpoints/:endpointId", apiEndpoint.HandleUpdate)
	admin.DELETE("/api/v1/tenants/:slug/projects/:projectId/endpoints/:endpointId", apiEndpoint.HandleDelete)

	// API Group management
	viewer.GET("/api/v1/tenants/:slug/projects/:projectId/groups", apiGroup.HandleList)
	admin.POST("/api/v1/tenants/:slug/projects/:projectId/groups", apiGroup.HandleCreate)
	admin.PUT("/api/v1/tenants/:slug/projects/:projectId/groups/:groupId", apiGroup.HandleUpdate)
	admin.DELETE("/api/v1/tenants/:slug/projects/:projectId/groups/:groupId", apiGroup.HandleDelete)

	// OpenAPI export
	openapi := &OpenAPIHandler{tenants: tenantSvc, projectRepo: projectRepo, endpointRepo: endpointRepo, groupRepo: groupRepo}
	viewer.GET("/api/v1/tenants/:slug/projects/:projectId/openapi.json", openapi.HandleExportOpenAPI)

	// Query test execution
	authed.POST("/api/v1/tenants/:slug/query/test", queryTest.HandleTestQuery)

	// Script management
	viewer.GET("/api/v1/tenants/:slug/scripts", scriptHandler.HandleList)
	admin.POST("/api/v1/tenants/:slug/scripts", scriptHandler.HandleCreate)
	admin.PUT("/api/v1/tenants/:slug/scripts/:scriptId", scriptHandler.HandleUpdate)
	admin.DELETE("/api/v1/tenants/:slug/scripts/:scriptId", scriptHandler.HandleDelete)

	// Dynamic API query endpoint
	queryHandler.RegisterRoutes(r)
}
