package grpc

import (
	"context"
	"io"
	"log/slog"
	"net"
	"time"

	"github.com/hongjunyao/owlapi/internal/pb"
	"github.com/hongjunyao/owlapi/internal/service"
	"google.golang.org/grpc/peer"
)

type Handler struct {
	pb.UnimplementedGatewayServiceServer
	gateways service.GatewayService
	queries  service.QueryService
}

func NewHandler(gateways service.GatewayService, queries service.QueryService) *Handler {
	return &Handler{gateways: gateways, queries: queries}
}

func (h *Handler) Connect(stream pb.GatewayService_ConnectServer) error {
	var gatewayID string
	var tenantID string

	// Extract peer IP from gRPC connection
	peerIP := ""
	if p, ok := peer.FromContext(stream.Context()); ok && p.Addr != nil {
		host, _, err := net.SplitHostPort(p.Addr.String())
		if err == nil {
			peerIP = host
		}
	}

	defer func() {
		if gatewayID != "" && tenantID != "" {
			h.gateways.RemoveStream(tenantID, gatewayID)
			slog.Info("Gateway disconnected", "tenant_id", tenantID, "gateway_id", gatewayID)
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
		case *pb.GatewayMessage_Register:
			gatewayID = p.Register.GatewayId
			tenantID = p.Register.TenantId
			resp, err := h.gateways.Register(context.Background(), p.Register, peerIP)
			if err != nil {
				return err
			}
			if err := stream.Send(&pb.ServerMessage{
				Payload: &pb.ServerMessage_RegisterAck{RegisterAck: resp},
			}); err != nil {
				return err
			}
			if resp.Success {
				h.gateways.AddStream(tenantID, gatewayID, stream)
				slog.Info("Gateway registered", "tenant_id", tenantID, "gateway_id", gatewayID)
			}

		case *pb.GatewayMessage_Heartbeat:
			if gatewayID == "" || tenantID == "" {
				slog.Warn("Heartbeat received before registration")
				continue
			}
			if err := h.gateways.Heartbeat(context.Background(), tenantID, gatewayID, peerIP); err != nil {
				slog.Error("Failed to process heartbeat", "tenant_id", tenantID, "gateway_id", gatewayID, "error", err)
			}
			if err := stream.Send(&pb.ServerMessage{
				Payload: &pb.ServerMessage_HeartbeatAck{
					HeartbeatAck: &pb.HeartbeatResponse{ServerTime: time.Now().Unix()},
				},
			}); err != nil {
				return err
			}

		case *pb.GatewayMessage_QueryResult:
			h.queries.NotifyResult(p.QueryResult)
		}
	}
}
