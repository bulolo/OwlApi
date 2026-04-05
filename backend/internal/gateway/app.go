package gateway

import (
	"context"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hongjunyao/owlapi/internal/config"
	"github.com/hongjunyao/owlapi/internal/pb"
	"github.com/hongjunyao/owlapi/internal/pkg/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
)

type App struct {
	config   *config.Config
	executor *Executor
}

func New() *App {
	cfg := config.LoadFromEnv()
	logger.Init(cfg.LogLevel)

	if cfg.GatewayID == "" || cfg.GatewayToken == "" {
		slog.Error("OWLAPI_GATEWAY_ID and OWLAPI_GATEWAY_TOKEN must be set")
		os.Exit(1)
	}

	return &App{
		config:   cfg,
		executor: NewExecutor(),
	}
}

func (a *App) Run() {
	// Initialize demo SQLite data if the file path is configured
	a.executor.InitDemoData("/data/owlapi_demo.db")
	slog.Info("OwlApi Gateway starting...",
		"tenant_id", a.config.TenantID,
		"gateway_id", a.config.GatewayID,
		"server_url", a.config.ServerURL)

	for {
		if err := a.connectAndServe(); err != nil {
			slog.Error("Connection lost, retrying in 5 seconds...", "error", err)
			time.Sleep(5 * time.Second)
		}
	}
}

func (a *App) connectAndServe() error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	conn, err := grpc.DialContext(ctx, a.config.ServerURL,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithKeepaliveParams(keepalive.ClientParameters{
			Time:                10 * time.Second,
			Timeout:             3 * time.Second,
			PermitWithoutStream: true,
		}),
	)
	if err != nil {
		return err
	}
	defer conn.Close()

	client := pb.NewGatewayServiceClient(conn)
	stream, err := client.Connect(ctx)
	if err != nil {
		return err
	}

	// Register
	err = stream.Send(&pb.GatewayMessage{
		Payload: &pb.GatewayMessage_Register{
			Register: &pb.RegisterRequest{
				GatewayId:    a.config.GatewayID,
				GatewayToken: a.config.GatewayToken,
				Version:      "v0.1.0",
				TenantId:     a.config.TenantID,
			},
		},
	})
	if err != nil {
		return err
	}

	go a.startHeartbeat(ctx, stream)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	errorChan := make(chan error, 1)
	go func() {
		for {
			msg, err := stream.Recv()
			if err == io.EOF {
				errorChan <- nil
				return
			}
			if err != nil {
				errorChan <- err
				return
			}
			go a.handleServerMessage(stream, msg)
		}
	}()

	select {
	case <-stop:
		slog.Info("Shutting down Gateway...")
		return nil
	case err := <-errorChan:
		return err
	}
}

func (a *App) startHeartbeat(ctx context.Context, stream pb.GatewayService_ConnectClient) {
	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := stream.Send(&pb.GatewayMessage{
				Payload: &pb.GatewayMessage_Heartbeat{
					Heartbeat: &pb.HeartbeatRequest{Timestamp: time.Now().Unix()},
				},
			}); err != nil {
				slog.Error("Failed to send heartbeat", "error", err)
				return
			}
		case <-ctx.Done():
			return
		}
	}
}

func (a *App) handleServerMessage(stream pb.GatewayService_ConnectClient, msg *pb.ServerMessage) {
	switch p := msg.Payload.(type) {
	case *pb.ServerMessage_RegisterAck:
		if p.RegisterAck.Success {
			slog.Info("Gateway registered successfully", "session_id", p.RegisterAck.SessionId)
		} else {
			slog.Error("Gateway registration failed", "error", p.RegisterAck.Error)
			os.Exit(1)
		}
	case *pb.ServerMessage_ExecuteQuery:
		slog.Info("Executing query", "request_id", p.ExecuteQuery.RequestId)
		res := a.executor.Execute(p.ExecuteQuery)
		if err := stream.Send(&pb.GatewayMessage{
			Payload: &pb.GatewayMessage_QueryResult{QueryResult: res},
		}); err != nil {
			slog.Error("Failed to send query result", "error", err)
		}
	}
}
