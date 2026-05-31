package http

import (
	"log/slog"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/edition"
	"github.com/bulolo/owlapi/internal/repo/postgres"
	"github.com/bulolo/owlapi/internal/service"
	"github.com/gin-gonic/gin"
)

// EERouter is the contract surface that EE modules use to wire their routes.
// Members are the permission-tiered route groups already configured by main code
// (JWT + tenant role middleware applied), plus access to all wired services via *App.
type EERouter struct {
	App    *App
	SA     *gin.RouterGroup // super admin
	Viewer *gin.RouterGroup // tenant viewer +
	Admin  *gin.RouterGroup // tenant admin +
}

// EERouteRegistrar is the func signature EE init() functions register.
// CE builds simply have nothing registered.
type EERouteRegistrar func(*EERouter)

var eeRouteRegistrars []EERouteRegistrar

// RegisterEERoute is called from EE module init() to attach routes lazily.
// Idempotency: registrars must be safe to call once per process; we don't
// dedupe (re-registration would re-add routes which gin would reject anyway).
func RegisterEERoute(fn EERouteRegistrar) {
	eeRouteRegistrars = append(eeRouteRegistrars, fn)
}

// App holds all wired dependencies for the HTTP layer.
type App struct {
	// DB 暴露给 EE 模块构造自己的仓储；主代码 handler 用不到。
	DB            *postgres.DB
	Auth          service.AuthService
	Tenant        service.TenantService
	TenantUser    service.TenantUserService
	Gateway       service.GatewayAdminService
	GatewayBroker service.GatewayBroker
	DataSource    service.DataSourceService
	Environment   service.EnvironmentService
	Project       service.ProjectService
	Endpoint      service.APIEndpointService
	Version       service.EndpointVersionService
	Group         service.APIGroupService
	Script        service.ScriptService
	Query         service.QueryService
	CallLog       service.EndpointCallLogService
	Overview      service.OverviewService
	Authz         service.AuthorizationService
}

// RegisterRoutes wires all HTTP handlers and middleware to the gin engine.
func (a *App) RegisterRoutes(r *gin.Engine) {
	authH := &AuthHandler{auth: a.Auth}
	platformSettingsH := &PlatformSettingsHandler{}
	tenantH := &TenantHandler{tenants: a.Tenant}
	tuH := &TenantUserHandler{tenantUsers: a.TenantUser}
	gatewayH := &GatewayHandler{gateways: a.Gateway}
	dsH := &DataSourceAliasr{dataSources: a.DataSource}
	envH := &EnvironmentHandler{envs: a.Environment}
	projectH := &ProjectHandler{projects: a.Project}
	endpointH := &APIEndpointHandler{endpoints: a.Endpoint, active: a.Version, envs: a.Environment}
	versionH := &EndpointVersionHandler{versions: a.Version, envs: a.Environment}
	callLogH := &EndpointCallLogHandler{callLogs: a.CallLog}
	overviewH := &OverviewHandler{overview: a.Overview}
	groupH := &APIGroupHandler{groups: a.Group}
	scriptH := &ScriptHandler{scripts: a.Script}
	runH := &RunHandler{projects: a.Project, queries: a.Query, endpoints: a.Endpoint, versions: a.Version, envs: a.Environment, callLogs: a.CallLog}
	queryH := NewQueryHandler(a.Query, a.Endpoint, a.Version, a.Tenant, a.Project, a.Environment, a.CallLog)
	queryTestH := &QueryTestHandler{tenants: a.Tenant, gateways: a.GatewayBroker, queries: a.Query, endpoints: a.Endpoint, dataSources: a.DataSource, envs: a.Environment}
	openAPIH := &OpenAPIHandler{projects: a.Project, endpoints: a.Endpoint, groups: a.Group, envs: a.Environment, scripts: a.Script}
	shareRepo := &postgres.OpenAPIShareTokenRepo{DB: a.DB}
	shareH := &OpenAPIShareHandler{repo: shareRepo, openAPI: openAPIH}

	// Public share routes — no auth required
	r.GET("/public/openapi/:token", shareH.HandlePublicOpenAPI)

	v1 := r.Group("/v1")
	v1.POST("/auth/register", authH.HandleRegister)
	v1.POST("/auth/login", authH.HandleLogin)
	v1.PUT("/auth/change-password", JWTAuth(), authH.HandleChangePassword)
	v1.GET("/platform/settings", platformSettingsH.HandleGet)
	v1.GET("/my/tenants", JWTAuth(), tenantH.HandleMyTenants)
	v1.POST("/tenants/:slug/query/test", JWTAuth(), RequireTenantRole(a.Authz, domain.RoleViewer), queryTestH.HandleTestQuery)
	v1.GET("/tenants/:slug/datasources/:datasourceId/schema", JWTAuth(), RequireTenantRole(a.Authz, domain.RoleViewer), queryTestH.HandleGetSchema)
	v1.GET("/tenants/:slug/datasources/:datasourceId/tables/:table/preview", JWTAuth(), RequireTenantRole(a.Authz, domain.RoleViewer), queryTestH.HandlePreviewTable)

	// 超级管理员分组：核心不在此注册业务路由，仅保留分组定义供扩展模块复用
	// （扩展模块会按需在此注册超管级路由）。公开的 GET /platform/settings 在上方核心注册。
	sa := v1.Group("", JWTAuth(), RequireSuperAdmin())

	viewer := v1.Group("", JWTAuth(), RequireTenantRole(a.Authz, domain.RoleViewer))
	viewer.GET("/tenants/:slug", tenantH.HandleGetTenant)
	viewer.GET("/tenants/:slug/users", tuH.HandleList)
	viewer.GET("/tenants/:slug/gateways", gatewayH.HandleList)
	viewer.GET("/tenants/:slug/gateways/:gatewayId", gatewayH.HandleGet)
	viewer.GET("/tenants/:slug/datasources", dsH.HandleList)
	viewer.GET("/tenants/:slug/datasources/:datasourceId", dsH.HandleGet)
	viewer.GET("/tenants/:slug/projects", projectH.HandleList)
	viewer.GET("/tenants/:slug/projects/:projectId", projectH.HandleGet)
	viewer.GET("/tenants/:slug/projects/:projectId/auth", projectH.HandleGetAuth)
	viewer.POST("/tenants/:slug/projects/:projectId/run", runH.HandleRun)
	viewer.POST("/tenants/:slug/projects/:projectId/run-sql", runH.HandleRunSQL)
	viewer.GET("/tenants/:slug/projects/:projectId/environments", envH.HandleList)
	viewer.GET("/tenants/:slug/projects/:projectId/bindings", envH.HandleListBindings)
	viewer.GET("/tenants/:slug/projects/:projectId/environments/:envId/bindings", envH.HandleListEnvBindings)
	viewer.GET("/tenants/:slug/projects/:projectId/endpoints", endpointH.HandleList)
	viewer.GET("/tenants/:slug/projects/:projectId/endpoints/:endpointId/versions", versionH.HandleList)
	viewer.GET("/tenants/:slug/projects/:projectId/endpoints/:endpointId/actives", versionH.HandleListActives)
	viewer.GET("/tenants/:slug/projects/:projectId/endpoints/:endpointId/activation-log", versionH.HandleListActivationLog)
	viewer.GET("/tenants/:slug/projects/:projectId/endpoints/:endpointId/call-logs", callLogH.HandleList)
	viewer.GET("/tenants/:slug/overview/traffic", overviewH.HandleTrafficSeries)
	viewer.GET("/tenants/:slug/overview/activity", overviewH.HandleRecentActivity)
	viewer.GET("/tenants/:slug/projects/:projectId/groups", groupH.HandleList)
	viewer.GET("/tenants/:slug/projects/:projectId/openapi.json", openAPIH.HandleExportOpenAPI)
	viewer.GET("/tenants/:slug/projects/:projectId/openapi-share", shareH.HandleGetShareToken)
	viewer.POST("/tenants/:slug/projects/:projectId/openapi-share", shareH.HandleCreateShareToken)
	viewer.DELETE("/tenants/:slug/projects/:projectId/openapi-share", shareH.HandleRevokeShareToken)
	viewer.GET("/tenants/:slug/scripts", scriptH.HandleList)
	viewer.GET("/tenants/:slug/scripts/builtins", scriptH.HandleListBuiltins)

	admin := v1.Group("", JWTAuth(), RequireTenantRole(a.Authz, domain.RoleAdmin), DemoGuard())
	admin.PUT("/tenants/:slug/settings", tenantH.HandleUpdateTenantSettings)
	admin.POST("/tenants/:slug/users", tuH.HandleCreate)
	admin.PUT("/tenants/:slug/users/:userId/role", tuH.HandleUpdateRole)
	admin.DELETE("/tenants/:slug/users/:userId", tuH.HandleDelete)
	admin.POST("/tenants/:slug/gateways", gatewayH.HandleCreate)
	admin.DELETE("/tenants/:slug/gateways/:gatewayId", gatewayH.HandleDelete)
	admin.POST("/tenants/:slug/datasources/test", queryTestH.HandleTestDatasource)
	admin.POST("/tenants/:slug/datasources", dsH.HandleCreate)
	admin.PUT("/tenants/:slug/datasources/:datasourceId", dsH.HandleUpdate)
	admin.DELETE("/tenants/:slug/datasources/:datasourceId", dsH.HandleDelete)
	admin.POST("/tenants/:slug/projects", projectH.HandleCreate)
	admin.PUT("/tenants/:slug/projects/:projectId", projectH.HandleUpdate)
	admin.DELETE("/tenants/:slug/projects/:projectId", projectH.HandleDelete)
	admin.PUT("/tenants/:slug/projects/:projectId/auth", projectH.HandleUpdateAuth)
	admin.POST("/tenants/:slug/projects/:projectId/auth/keys", projectH.HandleCreateAuthKey)
	admin.DELETE("/tenants/:slug/projects/:projectId/auth/keys/:keyId", projectH.HandleDeleteAuthKey)
	admin.POST("/tenants/:slug/projects/:projectId/environments", envH.HandleCreate)
	admin.PUT("/tenants/:slug/projects/:projectId/environments/:envId", envH.HandleRename)
	admin.DELETE("/tenants/:slug/projects/:projectId/environments/:envId", envH.HandleDelete)
	admin.POST("/tenants/:slug/projects/:projectId/environments/:envId/default", envH.HandleSetDefault)
	admin.POST("/tenants/:slug/projects/:projectId/environments/:envId/bindings", envH.HandleUpsertBinding)
	admin.DELETE("/tenants/:slug/projects/:projectId/environments/:envId/bindings/:alias", envH.HandleDeleteBinding)
	admin.POST("/tenants/:slug/projects/:projectId/aliases/rename", envH.HandleRenameAlias)
	admin.POST("/tenants/:slug/projects/:projectId/endpoints", endpointH.HandleCreate)
	admin.PUT("/tenants/:slug/projects/:projectId/endpoints/:endpointId", endpointH.HandleUpdate)
	admin.PATCH("/tenants/:slug/projects/:projectId/endpoints/:endpointId", endpointH.HandlePatch)
	admin.DELETE("/tenants/:slug/projects/:projectId/endpoints/:endpointId", endpointH.HandleDelete)
	admin.POST("/tenants/:slug/projects/:projectId/endpoints/:endpointId/publish", versionH.HandlePublish)
	admin.POST("/tenants/:slug/projects/:projectId/endpoints/:endpointId/unpublish", versionH.HandleUnpublish)
	admin.POST("/tenants/:slug/projects/:projectId/endpoints/:endpointId/revert", versionH.HandleRevertToActive)
	admin.POST("/tenants/:slug/projects/:projectId/endpoints/:endpointId/promote", versionH.HandlePromote)
	admin.POST("/tenants/:slug/projects/:projectId/endpoints/:endpointId/versions", versionH.HandleCreateVersion)
	admin.POST("/tenants/:slug/projects/:projectId/endpoints/:endpointId/versions/:versionId/activate", versionH.HandleActivate)
	admin.DELETE("/tenants/:slug/projects/:projectId/endpoints/:endpointId/versions/:versionId", versionH.HandleDeleteVersion)
	admin.POST("/tenants/:slug/projects/:projectId/groups", groupH.HandleCreate)
	admin.PUT("/tenants/:slug/projects/:projectId/groups/:groupId", groupH.HandleUpdate)
	admin.DELETE("/tenants/:slug/projects/:projectId/groups/:groupId", groupH.HandleDelete)
	admin.POST("/tenants/:slug/scripts", scriptH.HandleCreate)
	admin.POST("/tenants/:slug/scripts/builtins/:builtinId/copy", scriptH.HandleCopyFromBuiltin)
	admin.PUT("/tenants/:slug/scripts/:scriptId", scriptH.HandleUpdate)
	admin.DELETE("/tenants/:slug/scripts/:scriptId", scriptH.HandleDelete)

	queryH.RegisterRoutes(r)

	// EE-only route injection. EE modules register via init() at package import time;
	// main code activates them here only when license is valid. CE builds have
	// `eeRouteRegistrars` as an empty slice → no-op.
	if edition.IsLicensed() && len(eeRouteRegistrars) > 0 {
		eer := &EERouter{App: a, SA: sa, Viewer: viewer, Admin: admin}
		for _, fn := range eeRouteRegistrars {
			fn(eer)
		}
		slog.Info("EE routes registered", "count", len(eeRouteRegistrars))
	}
}
