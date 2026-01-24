package main

import (
	"log/slog"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/pkg/logger"
	"github.com/hongjunyao/owlapi/internal/pb"
	"github.com/hongjunyao/owlapi/internal/repo"
	"github.com/hongjunyao/owlapi/internal/service"
	transport_grpc "github.com/hongjunyao/owlapi/internal/transport/grpc"
	transport_http "github.com/hongjunyao/owlapi/internal/transport/http"
	"google.golang.org/grpc"
)

func main() {
	// 1. Init Logger
	logger.Init("debug")
	slog.Info("Starting OwlApi Control Plane...")

	// 2. Init Repo
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pgRepo, err := postgres.NewRepository(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("Failed to initialize PostgreSQL repository", "error", err)
		os.Exit(1)
	}

	// Seed some test data (Optional if DB is persistent)
	pgRepo.Create(context.Background(), &domain.Runner{ID: "test-runner", Name: "Test Gateway Runner", Token: "token123", Status: "offline"})

	// 3. Init Services
	runnerService := service.NewRunnerService(pgRepo)
	queryService := service.NewQueryService(runnerService, pgRepo)

	// 4. Start gRPC Server
	go func() {
		lis, err := net.Listen("tcp", ":9090")
		if err != nil {
			slog.Error("Failed to listen gRPC", "error", err)
			os.Exit(1)
		}
		sServer := grpc.NewServer()
		pb.RegisterGatewayServiceServer(sServer, transport_grpc.NewHandler(runnerService, queryService))
		slog.Info("gRPC Server listening on :9090")
		if err := sServer.Serve(lis); err != nil {
			slog.Error("gRPC server failed", "error", err)
		}
	}()

	// 5. Start HTTP Server
	go func() {
		r := gin.Default()
		httpHandler := transport_http.NewHandler(queryService, projectRepo)
		httpHandler.RegisterRoutes(r)
		slog.Info("HTTP Server listening on :8080")
		if err := r.Run(":8080"); err != nil {
			slog.Error("HTTP server failed", "error", err)
		}
	}()

	// Wait for interrupt signal
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	slog.Info("Shutting down OwlApi Control Plane...")
}
