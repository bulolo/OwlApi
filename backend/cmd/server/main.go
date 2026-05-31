// @title           OwlApi Control Plane
// @version         0.2.1
// @description     企业级 SQL to API 智能网关平台管理接口
// @host            localhost:3000
// @BasePath        /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description 格式: Bearer {token}

package main

import (
	"context"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bulolo/owlapi/internal/config"
	"github.com/bulolo/owlapi/internal/edition"
	"github.com/bulolo/owlapi/internal/pb"
	"github.com/bulolo/owlapi/internal/pkg/auth"
	"github.com/bulolo/owlapi/internal/pkg/crypto"
	"github.com/bulolo/owlapi/internal/pkg/logger"
	"github.com/bulolo/owlapi/internal/repo/postgres"
	"github.com/bulolo/owlapi/internal/service"
	transport_grpc "github.com/bulolo/owlapi/internal/transport/grpc"
	transport_http "github.com/bulolo/owlapi/internal/transport/http"

	// EE-only modules: 通过 init() 注册路由和迁移。sync_ce.sh 会删除这一段。

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
)

func main() {
	cfg := config.LoadServerConfig()
	if err := cfg.Validate(); err != nil {
		slog.Warn("config validation warning", "err", err)
	}
	logger.Init(cfg.LogLevel)
	slog.Info("Starting OwlApi Control Plane...")

	// Edition / License 在所有业务初始化之前确定，后续模块通过 edition.IsLicensed() 决策。
	edition.Init(cfg.Edition, cfg.LicenseKey)

	auth.Init(cfg.JWTSecret)
	// 用 JWT_SECRET 派生数据列加密 KEK（同一 master 保证集群内一致），
	// 必须放在任何会读/写加密字段的模块初始化前。
	crypto.Init(cfg.JWTSecret)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := postgres.NewDB(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("Failed to connect database", "error", err)
		os.Exit(1)
	}

	// Repos
	tenantRepo := &postgres.TenantRepo{DB: db}
	userRepo := &postgres.UserRepo{DB: db}
	tenantUserRepo := &postgres.TenantUserRepo{DB: db}
	gatewayRepo := &postgres.GatewayRepo{DB: db}
	projectRepo := &postgres.ProjectRepo{DB: db}
	authKeyRepo := &postgres.ProjectAuthKeyRepo{DB: db}
	dsRepo := &postgres.DataSourceRepo{DB: db}
	endpointRepo := &postgres.APIEndpointRepo{DB: db}
	versionRepo := &postgres.EndpointVersionRepo{DB: db}
	activeVersionRepo := &postgres.EndpointActiveVersionRepo{DB: db}
	activationLogRepo := &postgres.EndpointActivationLogRepo{DB: db}
	callLogRepo := &postgres.EndpointCallLogRepo{DB: db}
	groupRepo := &postgres.APIGroupRepo{DB: db}
	scriptRepo := &postgres.ScriptRepo{DB: db}
	projectEnvRepo := &postgres.ProjectEnvironmentRepo{DB: db}
	bindingRepo := &postgres.EndpointDatasourceBindingRepo{DB: db}

	// Services
	authSvc := service.NewAuthService(userRepo, tenantRepo, tenantUserRepo)
	tenantSvc := service.NewTenantService(tenantRepo, tenantUserRepo)
	tenantUserSvc := service.NewTenantUserService(userRepo, tenantUserRepo)
	gatewaySvc := service.NewGatewayService(gatewayRepo)
	dsSvc := service.NewDataSourceService(dsRepo)
	envSvc := service.NewEnvironmentService(projectEnvRepo, bindingRepo, activeVersionRepo, dsRepo)
	projectSvc := service.NewProjectService(projectRepo, authKeyRepo)
	endpointSvc := service.NewAPIEndpointService(endpointRepo, activeVersionRepo)
	versionSvc := service.NewEndpointVersionService(versionRepo, activeVersionRepo, activationLogRepo, endpointRepo, scriptRepo, dsRepo)
	callLogSvc := service.NewEndpointCallLogService(callLogRepo)
	overviewSvc := service.NewOverviewService(activationLogRepo, callLogRepo)
	groupSvc := service.NewAPIGroupService(groupRepo)
	scriptSvc := service.NewScriptService(scriptRepo)
	querySvc := service.NewQueryService(gatewaySvc, envSvc, scriptSvc, cfg.QueryTimeoutSeconds+5)
	authzSvc := service.NewAuthorizationService(tenantRepo, tenantUserRepo)

	// HTTP Server
	r := gin.Default()
	// Disable gin's auto-redirect on trailing slash / fixed path. Cross-origin
	// 307 redirects fail CORS preflight (browsers don't follow OPTIONS redirects),
	// and the gateway wildcard route `/:env/:tenant/:project/*path` interacts
	// badly with the trailing-slash heuristic — better to 404 cleanly than
	// silently redirect.
	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false
	r.Use(transport_http.RequestID())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Tenant-ID", "X-Gateway-ID", "X-Request-ID"},
		AllowCredentials: cfg.CORSOrigin != "*",
	}))
	r.GET("/health", transport_http.HandleHealth)
	transport_http.RegisterSwagger(r)

	app := &transport_http.App{
		DB:   db,
		Auth: authSvc, Tenant: tenantSvc, TenantUser: tenantUserSvc,
		Gateway: gatewaySvc, GatewayBroker: gatewaySvc,
		DataSource: dsSvc, Environment: envSvc, Project: projectSvc,
		Endpoint: endpointSvc, Version: versionSvc, Group: groupSvc, Script: scriptSvc, Query: querySvc, CallLog: callLogSvc,
		Overview: overviewSvc,
		Authz:    authzSvc,
	}
	app.RegisterRoutes(r)

	// Graceful HTTP server
	httpServer := &http.Server{Addr: cfg.HTTPPort, Handler: r}
	slog.Info("HTTP Server listening", "port", cfg.HTTPPort)
	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server failed", "error", err)
			os.Exit(1)
		}
	}()

	// gRPC Server
	grpcServer := grpc.NewServer(
		grpc.MaxRecvMsgSize(4*1024*1024),
		grpc.MaxSendMsgSize(4*1024*1024),
		grpc.KeepaliveParams(keepalive.ServerParameters{
			Time:    30 * time.Second,
			Timeout: 10 * time.Second,
		}),
		grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
			MinTime:             10 * time.Second,
			PermitWithoutStream: true,
		}),
	)
	grpcHandler := transport_grpc.NewHandler(gatewaySvc, querySvc)
	pb.RegisterGatewayServiceServer(grpcServer, grpcHandler)

	lis, err := net.Listen("tcp", cfg.GRPCPort)
	if err != nil {
		slog.Error("Failed to listen gRPC port", "port", cfg.GRPCPort, "error", err)
		os.Exit(1)
	}
	slog.Info("gRPC Server listening", "port", cfg.GRPCPort)
	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			slog.Error("gRPC server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	slog.Info("Shutting down OwlApi Control Plane...")

	// Graceful shutdown with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("HTTP server shutdown error", "error", err)
	}
	grpcServer.GracefulStop()
}
