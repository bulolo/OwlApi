package runner

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hongjunyao/owlapi/internal/config"
	"github.com/hongjunyao/owlapi/internal/pkg/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
)

type App struct {
	config *config.Config
}

func New() *App {
	cfg := config.LoadFromEnv()
	logger.Init(cfg.LogLevel)

	if cfg.AgentID == "" || cfg.AgentToken == "" {
		slog.Error("OWLAPI_AGENT_ID and OWLAPI_AGENT_TOKEN must be set")
		os.Exit(1)
	}

	return &App{
		config: cfg,
	}
}

func (a *App) Run() {
	slog.Info("OwlApi Gateway Agent starting...", 
		"agent_id", a.config.AgentID, 
		"server_url", a.config.ServerURL)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 1. 创建连接
	conn, err := grpc.DialContext(ctx, a.config.ServerURL,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time:                10 * time.Second,
			Timeout:             3 * time.Second,
			PermitWithoutStream: true,
		}),
	)
	if err != nil {
		slog.Error("Failed to connect to server", "error", err)
		os.Exit(1)
	}
	defer conn.Close()

	slog.Info("Connected to Control Plane successfully!")

	// TODO: 创建双向流
	// client := pb.NewGatewayServiceClient(conn)

	// 2. 启动心跳
	go a.startHeartbeat(ctx)

	// 3. 等待信号
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	slog.Info("Shutting down agent...")
}

func (a *App) startHeartbeat(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			slog.Debug("Heartbeat: Agent is alive")
			// TODO: Send heartbeat
		case <-ctx.Done():
			return
		}
	}
}
