package server

import (
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/hongjunyao/owlapi/internal/config"
	"github.com/hongjunyao/owlapi/internal/pkg/logger"
	"google.golang.org/grpc"
)

type App struct {
	config *config.Config
}

func New() *App {
	// 1. 初始化配置
	cfg := config.LoadFromEnv()
	
	// 2. 初始化日志
	logger.Init(cfg.LogLevel)

	return &App{
		config: cfg,
	}
}

func (a *App) Run() {
	slog.Info("Starting OwlApi Control Plane Server...")

	// 通道用于等待信号
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	// 1. 启动 gRPC Server（用于 Agent 连接）
	go a.startGRPCServer()

	// 2. 启动 HTTP Server（用于 API 请求）
	go a.startHTTPServer()

	// 阻塞等待停止信号
	<-stop
	slog.Info("Shutting down server...")
}

func (a *App) startGRPCServer() {
	lis, err := net.Listen("tcp", ":9090")
	if err != nil {
		slog.Error("Failed to listen for gRPC", "error", err)
		os.Exit(1)
	}

	grpcServer := grpc.NewServer()

	// TODO: 注册 GatewayService
	// pb.RegisterGatewayServiceServer(grpcServer, &gatewayServer{})

	slog.Info("gRPC Server listening on :9090 (for Agent connections)")
	if err := grpcServer.Serve(lis); err != nil {
		slog.Error("Failed to serve gRPC", "error", err)
	}
}

func (a *App) startHTTPServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, `{"status":"ok"}`)
	})

	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	slog.Info("HTTP Server listening on :8080 (for API requests)")
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("Failed to serve HTTP", "error", err)
	}
}
