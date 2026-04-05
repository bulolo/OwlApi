package main

import (
	"context"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/config"
	"github.com/hongjunyao/owlapi/internal/pb"
	"github.com/hongjunyao/owlapi/internal/pkg/auth"
	"github.com/hongjunyao/owlapi/internal/pkg/logger"
	"github.com/hongjunyao/owlapi/internal/repo/postgres"
	"github.com/hongjunyao/owlapi/internal/service"
	transport_grpc "github.com/hongjunyao/owlapi/internal/transport/grpc"
	transport_http "github.com/hongjunyao/owlapi/internal/transport/http"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"
)

func main() {
	cfg := config.LoadFromEnv()
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
	tenantRepo := &postgres.TenantRepo{DB: db}
	userRepo := &postgres.UserRepo{DB: db}
	tenantUserRepo := &postgres.TenantUserRepo{DB: db}
	gatewayRepo := &postgres.GatewayRepo{DB: db}
	projectRepo := &postgres.ProjectRepo{DB: db}

	// Services
	authSvc := service.NewAuthService(userRepo, tenantRepo, tenantUserRepo)
	tenantSvc := service.NewTenantService(tenantRepo, tenantUserRepo)
	tenantUserSvc := service.NewTenantUserService(userRepo, tenantUserRepo)
	gatewaySvc := service.NewGatewayService(gatewayRepo)
	querySvc := service.NewQueryService(gatewaySvc, projectRepo)

	// HTTP Server
	r := gin.Default()
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Tenant-ID,X-Gateway-ID")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})
	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	transport_http.RegisterSwagger(r)
	transport_http.RegisterRoutes(r, authSvc, tenantSvc, tenantUserSvc, gatewaySvc, querySvc, projectRepo, tenantRepo, tenantUserRepo)

	slog.Info("HTTP Server listening", "port", cfg.HTTPPort)
	go func() {
		if err := r.Run(cfg.HTTPPort); err != nil {
			slog.Error("HTTP server failed", "error", err)
			os.Exit(1)
		}
	}()

	// gRPC Server
	grpcServer := grpc.NewServer(
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
	grpcServer.GracefulStop()
}
