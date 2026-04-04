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

	if cfg.RunnerID == "" || cfg.RunnerToken == "" {
		slog.Error("OWLAPI_RUNNER_ID and OWLAPI_RUNNER_TOKEN must be set")
		os.Exit(1)
	}

	return &App{
		config:   cfg,
		executor: NewExecutor(),
	}
}

func (a *App) Run() {
	slog.Info("OwlApi Gateway Runner starting...", 
		"tenant_id", a.config.TenantID,
		"runner_id", a.config.RunnerID, 
		"server_url", a.config.ServerURL)

	for {
		err := a.connectAndServe()
		if err != nil {
			slog.Error("Connection lost, retrying in 5 seconds...", "error", err)
			time.Sleep(5 * time.Second)
			continue
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

	// 1. Register
	err = stream.Send(&pb.RunnerMessage{
		Payload: &pb.RunnerMessage_Register{
			Register: &pb.RegisterRequest{
				NodeId:    a.config.RunnerID,
				NodeToken: a.config.RunnerToken,
				Version:   "v0.1.0",
				TenantId:  a.config.TenantID,
			},
		},
	})
	if err != nil {
		return err
	}

	// 2. Start Message Loops
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
		slog.Info("Shutting down Gateway Runner...")
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
			err := stream.Send(&pb.RunnerMessage{
				Payload: &pb.RunnerMessage_Heartbeat{
					Heartbeat: &pb.HeartbeatRequest{
						Timestamp: time.Now().Unix(),
					},
				},
			})
			if err != nil {
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
			slog.Info("Gateway Runner registered successfully", "session_id", p.RegisterAck.SessionId)
		} else {
			slog.Error("Registration failed", "error", p.RegisterAck.Error)
			os.Exit(1)
		}
	case *pb.ServerMessage_ExecuteQuery:
		slog.Info("Executing query", "request_id", p.ExecuteQuery.RequestId)
		res := a.executor.Execute(p.ExecuteQuery)
		err := stream.Send(&pb.RunnerMessage{
			Payload: &pb.RunnerMessage_QueryResult{
				QueryResult: res,
			},
		})
		if err != nil {
			slog.Error("Failed to send query result", "error", err)
		}
	}
}
