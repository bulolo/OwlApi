package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/bulolo/owlapi/internal/domain"
	"github.com/bulolo/owlapi/internal/pb"
)

// GatewayAdminService handles CRUD for gateways (used by HTTP handlers).
type GatewayAdminService interface {
	Create(ctx context.Context, gw *domain.Gateway) error
	List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Gateway, int, error)
	GetByID(ctx context.Context, tenantID, id int64) (*domain.Gateway, error)
	Delete(ctx context.Context, tenantID, id int64) error
}

// GatewayBroker manages live gRPC stream connections from gateway agents.
type GatewayBroker interface {
	Register(ctx context.Context, req *pb.RegisterRequest, peerIP string) (*pb.RegisterResponse, error)
	Heartbeat(ctx context.Context, gatewayID, peerIP string) error
	AddStream(gatewayID string, stream pb.GatewayService_ConnectServer)
	RemoveStream(gatewayID string)
	GetStream(gatewayID string) pb.GatewayService_ConnectServer
}

// GatewayService combines admin CRUD and broker stream management.
// Deprecated: prefer GatewayAdminService or GatewayBroker depending on use case.
type GatewayService interface {
	GatewayAdminService
	GatewayBroker
}

type streamEntry struct {
	stream   pb.GatewayService_ConnectServer
	lastSeen time.Time
}

type gatewayService struct {
	repo    domain.GatewayRepository
	streams sync.Map // gatewayID(str) → streamEntry
}

func NewGatewayService(repo domain.GatewayRepository) GatewayService {
	svc := &gatewayService{repo: repo}
	go svc.cleanupLoop()
	return svc
}

// cleanupLoop periodically removes stream entries that have not received a heartbeat
// within the stale threshold and marks the corresponding gateway as offline.
func (s *gatewayService) cleanupLoop() {
	const staleThreshold = 2 * time.Minute
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		threshold := time.Now().Add(-staleThreshold)
		s.streams.Range(func(key, value any) bool {
			entry := value.(streamEntry)
			if entry.lastSeen.Before(threshold) {
				gatewayID := key.(string)
				s.streams.Delete(gatewayID)
				if gid, err := strconv.ParseInt(gatewayID, 10, 64); err == nil {
					if err := s.repo.UpdateStatus(context.Background(), gid, domain.GatewayOffline, ""); err != nil {
						slog.Warn("cleanup: failed to mark gateway offline", "gateway_id", gatewayID, "err", err)
					}
				}
			}
			return true
		})
	}
}

func (s *gatewayService) Create(ctx context.Context, gw *domain.Gateway) error {
	if gw.Token == "" {
		token := make([]byte, 16)
		if _, err := rand.Read(token); err != nil {
			return err
		}
		gw.Token = "gw_" + hex.EncodeToString(token)
	}
	gw.Status = domain.GatewayOffline
	gw.LastSeen = time.Now()
	return s.repo.Create(ctx, gw)
}

func (s *gatewayService) List(ctx context.Context, tenantID int64, p domain.ListParams) ([]*domain.Gateway, int, error) {
	return s.repo.List(ctx, tenantID, p)
}

func (s *gatewayService) GetByID(ctx context.Context, tenantID, id int64) (*domain.Gateway, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *gatewayService) Delete(ctx context.Context, tenantID, id int64) error {
	gw, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if gw.IsPlatform {
		return domain.ErrForbidden("平台内置网关不可删除")
	}
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *gatewayService) Register(ctx context.Context, req *pb.RegisterRequest, peerIP string) (*pb.RegisterResponse, error) {
	gw, err := s.repo.GetByToken(ctx, req.GatewayToken)
	if err != nil {
		return &pb.RegisterResponse{Success: false, Error: "invalid gateway token"}, nil
	}

	// Tenant-specific gateways must also supply matching tenant_id + gateway_id.
	if !gw.IsPlatform {
		tenantID, err := strconv.ParseInt(req.TenantId, 10, 64)
		if err != nil || tenantID != gw.TenantID {
			return &pb.RegisterResponse{Success: false, Error: "invalid tenant ID"}, nil
		}
		gatewayID, err := strconv.ParseInt(req.GatewayId, 10, 64)
		if err != nil || gatewayID != gw.ID {
			return &pb.RegisterResponse{Success: false, Error: "invalid gateway ID"}, nil
		}
	}

	if err := s.repo.UpdateStatus(ctx, gw.ID, domain.GatewayOnline, peerIP); err != nil {
		return &pb.RegisterResponse{Success: false, Error: "failed to update status"}, nil
	}

	gwIDStr := strconv.FormatInt(gw.ID, 10)
	return &pb.RegisterResponse{
		Success:   true,
		SessionId: gwIDStr,
	}, nil
}

func (s *gatewayService) Heartbeat(ctx context.Context, gatewayID, peerIP string) error {
	gid, err := strconv.ParseInt(gatewayID, 10, 64)
	if err != nil {
		return domain.ErrBadRequestf("invalid gateway ID: %s", gatewayID)
	}
	// Refresh lastSeen so the cleanup goroutine doesn't evict this connection.
	if val, ok := s.streams.Load(gatewayID); ok {
		entry := val.(streamEntry)
		entry.lastSeen = time.Now()
		s.streams.Store(gatewayID, entry)
	}
	return s.repo.UpdateStatus(ctx, gid, domain.GatewayOnline, peerIP)
}

func (s *gatewayService) AddStream(gatewayID string, stream pb.GatewayService_ConnectServer) {
	s.streams.Store(gatewayID, streamEntry{stream: stream, lastSeen: time.Now()})
}

func (s *gatewayService) RemoveStream(gatewayID string) {
	s.streams.Delete(gatewayID)
}

func (s *gatewayService) GetStream(gatewayID string) pb.GatewayService_ConnectServer {
	val, ok := s.streams.Load(gatewayID)
	if !ok {
		return nil
	}
	return val.(streamEntry).stream
}
