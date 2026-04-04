package grpc

// TODO: Wire up with actual pb package after running `make gen-proto`.

import (
	"context"
	"io"
	"log/slog"

	"github.com/hongjunyao/owlapi/internal/pb"
	"github.com/hongjunyao/owlapi/internal/service"
)

type Handler struct {
	pb.UnimplementedGatewayServiceServer
	runnerService service.RunnerService
	queryService  service.QueryService
}

func NewHandler(runnerService service.RunnerService, queryService service.QueryService) *Handler {
	return &Handler{
		runnerService: runnerService,
		queryService:  queryService,
	}
}

func (h *Handler) Connect(stream pb.GatewayService_ConnectServer) error {
	var runnerID string
	var tenantID string
	defer func() {
		if runnerID != "" && tenantID != "" {
			h.runnerService.RemoveStream(tenantID, runnerID)
			slog.Info("Runner disconnected", "tenant_id", tenantID, "runner_id", runnerID)
		}
	}()

	for {
		req, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}

		switch p := req.Payload.(type) {
		case *pb.RunnerMessage_Register:
			runnerID = p.Register.NodeId
			tenantID = p.Register.TenantId
			resp, err := h.runnerService.Register(context.Background(), p.Register)
			if err != nil {
				return err
			}
			err = stream.Send(&pb.ServerMessage{
				Payload: &pb.ServerMessage_RegisterAck{
					RegisterAck: resp,
				},
			})
			if err != nil {
				return err
			}
			if resp.Success {
				h.runnerService.AddStream(tenantID, runnerID, stream)
				slog.Info("Runner registered and connected", "tenant_id", tenantID, "runner_id", runnerID)
			}

		case *pb.RunnerMessage_Heartbeat:
			if runnerID == "" || tenantID == "" {
				slog.Warn("Heartbeat received before registration")
				continue
			}
			err := h.runnerService.Heartbeat(context.Background(), tenantID, runnerID)
			if err != nil {
				slog.Error("Failed to process heartbeat", "tenant_id", tenantID, "runner_id", runnerID, "error", err)
			}
			err = stream.Send(&pb.ServerMessage{
				Payload: &pb.ServerMessage_HeartbeatAck{
					HeartbeatAck: &pb.HeartbeatResponse{
						ServerTime: 0, // Should use actual time
					},
				},
			})
			if err != nil {
				return err
			}

		case *pb.RunnerMessage_QueryResult:
			// Route query result to the waiting HTTP handler
			h.queryService.NotifyResult(p.QueryResult)
		}
	}
}
