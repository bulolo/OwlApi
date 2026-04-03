package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/config"
	"github.com/hongjunyao/owlapi/internal/pkg/auth"
	"github.com/hongjunyao/owlapi/internal/pkg/logger"
	"github.com/hongjunyao/owlapi/internal/repo/postgres"
	"github.com/hongjunyao/owlapi/internal/service"
	transport_http "github.com/hongjunyao/owlapi/internal/transport/http"
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

	// TODO: gRPC server + query handler will be added after proto generation
	slog.Info("HTTP Server listening", "port", cfg.HTTPPort)
	go func() {
		if err := r.Run(cfg.HTTPPort); err != nil {
			slog.Error("HTTP server failed", "error", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	slog.Info("Shutting down OwlApi Control Plane...")
}
