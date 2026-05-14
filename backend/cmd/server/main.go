// @title           OwlApi Control Plane
// @version         0.1.8
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
	"github.com/bulolo/owlapi/internal/pb"
	"github.com/bulolo/owlapi/internal/pkg/auth"
	"github.com/bulolo/owlapi/internal/pkg/logger"
	"github.com/bulolo/owlapi/internal/repo/postgres"
	"github.com/bulolo/owlapi/internal/service"
	transport_grpc "github.com/bulolo/owlapi/internal/transport/grpc"
	transport_http "github.com/bulolo/owlapi/internal/transport/http"
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

	auth.Init(cfg.JWTSecret)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := postgres.NewDB(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("Failed to connect database", "error", err)
		os.Exit(1)
	}

	// Repos
	platformSettingsRepo := &postgres.PlatformSettingsRepo{DB: db}
	tenantRepo := &postgres.TenantRepo{DB: db}
	userRepo := &postgres.UserRepo{DB: db}
	tenantUserRepo := &postgres.TenantUserRepo{DB: db}
	gatewayRepo := &postgres.GatewayRepo{DB: db}
	projectRepo := &postgres.ProjectRepo{DB: db}
	dsRepo := &postgres.DataSourceRepo{DB: db}
	endpointRepo := &postgres.APIEndpointRepo{DB: db}
	releaseRepo := &postgres.EndpointReleaseRepo{DB: db}
	groupRepo := &postgres.APIGroupRepo{DB: db}
	scriptRepo := &postgres.ScriptRepo{DB: db}

	// Services
	platformSettingsSvc := service.NewPlatformSettingsService(platformSettingsRepo)
	authSvc := service.NewAuthService(userRepo, tenantRepo, tenantUserRepo)
	tenantSvc := service.NewTenantService(tenantRepo, tenantUserRepo)
	tenantUserSvc := service.NewTenantUserService(userRepo, tenantUserRepo)
	gatewaySvc := service.NewGatewayService(gatewayRepo)
	dsSvc := service.NewDataSourceService(dsRepo)
	projectSvc := service.NewProjectService(projectRepo)
	endpointSvc := service.NewAPIEndpointService(endpointRepo)
	releaseSvc := service.NewEndpointReleaseService(releaseRepo, endpointRepo)
	groupSvc := service.NewAPIGroupService(groupRepo)
	scriptSvc := service.NewScriptService(scriptRepo)
	querySvc := service.NewQueryService(gatewaySvc, dsSvc, scriptSvc, cfg.QueryTimeoutSeconds+5)
	authzSvc := service.NewAuthorizationService(tenantRepo, tenantUserRepo)

	// HTTP Server
	r := gin.Default()
	r.Use(transport_http.RequestID())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.CORSOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-Tenant-ID", "X-Gateway-ID", "X-Request-ID"},
		AllowCredentials: cfg.CORSOrigin != "*",
	}))
	r.GET("/health", func(c *gin.Context) { transport_http.OK(c, gin.H{"status": "ok"}) })
	transport_http.RegisterSwagger(r)

	app := &transport_http.App{
		Auth: authSvc, Tenant: tenantSvc, TenantUser: tenantUserSvc,
		Gateway: gatewaySvc, GatewayBroker: gatewaySvc,
		DataSource: dsSvc, Project: projectSvc,
		Endpoint: endpointSvc, Release: releaseSvc, Group: groupSvc, Script: scriptSvc, Query: querySvc,
		PlatformSettings: platformSettingsSvc,
		Authz:            authzSvc,
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
