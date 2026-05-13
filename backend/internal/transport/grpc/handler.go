package grpc

import (
	"io"
	"log/slog"
	"net"
	"time"

	"github.com/bulolo/owlapi/internal/pb"
	"github.com/bulolo/owlapi/internal/service"
	"google.golang.org/grpc/peer"
)

type Handler struct {
	pb.UnimplementedGatewayServiceServer
	gateways service.GatewayBroker
	queries  service.QueryService
}

func NewHandler(gateways service.GatewayBroker, queries service.QueryService) *Handler {
	return &Handler{gateways: gateways, queries: queries}
}

func (h *Handler) Connect(stream pb.GatewayService_ConnectServer) error {
	var gatewayID string
	ctx := stream.Context()

	peerIP := ""
	if p, ok := peer.FromContext(ctx); ok && p.Addr != nil {
		host, _, err := net.SplitHostPort(p.Addr.String())
		if err == nil {
			peerIP = host
		}
	}

	defer func() {
		if gatewayID != "" {
			h.gateways.RemoveStream(gatewayID)
			slog.Info("Gateway disconnected", "gateway_id", gatewayID)
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
			resp, err := h.gateways.Register(ctx, p.Register, peerIP)
			if err != nil {
				return err
			}
			if err := stream.Send(&pb.ServerMessage{
				Payload: &pb.ServerMessage_RegisterAck{RegisterAck: resp},
			}); err != nil {
				return err
			}
			if resp.Success {
				gatewayID = resp.SessionId // numeric gateway ID from DB
				h.gateways.AddStream(gatewayID, stream)
				slog.Info("Gateway registered", "gateway_id", gatewayID)
			}

		case *pb.GatewayMessage_Heartbeat:
			if gatewayID == "" {
				slog.Warn("Heartbeat received before registration")
				continue
			}
			if err := h.gateways.Heartbeat(ctx, gatewayID, peerIP); err != nil {
				slog.Error("Failed to process heartbeat", "gateway_id", gatewayID, "error", err)
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
