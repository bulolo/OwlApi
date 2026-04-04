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
	"github.com/hongjunyao/owlapi/internal/pkg/auth"
	"github.com/hongjunyao/owlapi/internal/pkg/logger"
	"github.com/hongjunyao/owlapi/internal/pb"
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

	// 0. Init JWT
	auth.Init(cfg.JWTSecret)

	// 1. Init Database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pgRepo, err := postgres.NewRepository(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("Failed to connect database", "error", err)
		os.Exit(1)
	}

	// 2. Build repo adapters
	tenantRepo := &postgres.TenantRepo{R: pgRepo}
	userRepo := &postgres.UserRepo{R: pgRepo}
	tenantUserRepo := &postgres.TenantUserRepo{R: pgRepo}

	// 3. Init Services
	authService := service.NewAuthService(userRepo, tenantRepo, tenantUserRepo)
	tenantService := service.NewTenantService(tenantRepo, tenantUserRepo)
	tenantUserService := service.NewTenantUserService(userRepo, tenantUserRepo)

	runnerRepo := &postgres.RunnerRepo{R: pgRepo}
	projectRepo := &postgres.ProjectRepo{R: pgRepo}
	runnerService := service.NewRunnerService(runnerRepo)
	queryService := service.NewQueryService(runnerService, projectRepo)

	// 4. Start HTTP Server
	r := gin.Default()

	// CORS middleware for frontend
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Tenant-ID,X-Runner-ID")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	transport_http.RegisterSwagger(r)

	authHandler := transport_http.NewAuthHandler(authService, tenantService, tenantUserService)
	authHandler.RegisterRoutes(r, tenantRepo, tenantUserRepo)

	// TODO: query handler will be wired to HTTP after full integration
	slog.Info("HTTP Server listening", "port", cfg.HTTPPort)
	go func() {
		if err := r.Run(cfg.HTTPPort); err != nil {
			slog.Error("HTTP server failed", "error", err)
			os.Exit(1)
		}
	}()

	// 5. Start gRPC Server
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
	grpcHandler := transport_grpc.NewHandler(runnerService, queryService)
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
