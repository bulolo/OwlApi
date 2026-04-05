package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/pb"
)

type GatewayService interface {
	// HTTP CRUD
	Create(ctx context.Context, gw *domain.Gateway) error
	List(ctx context.Context, tenantID int64) ([]*domain.Gateway, error)
	GetByID(ctx context.Context, tenantID, id int64) (*domain.Gateway, error)
	Delete(ctx context.Context, tenantID, id int64) error

	// gRPC stream management
	Register(ctx context.Context, req *pb.RegisterRequest, peerIP string) (*pb.RegisterResponse, error)
	Heartbeat(ctx context.Context, tenantID, gatewayID, peerIP string) error
	AddStream(tenantID, gatewayID string, stream pb.GatewayService_ConnectServer)
	RemoveStream(tenantID, gatewayID string)
	GetStream(tenantID, gatewayID string) pb.GatewayService_ConnectServer
}

type gatewayService struct {
	repo    domain.GatewayRepository
	streams sync.Map
}

func NewGatewayService(repo domain.GatewayRepository) GatewayService {
	return &gatewayService{repo: repo}
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

func (s *gatewayService) List(ctx context.Context, tenantID int64) ([]*domain.Gateway, error) {
	return s.repo.List(ctx, tenantID)
}

func (s *gatewayService) GetByID(ctx context.Context, tenantID, id int64) (*domain.Gateway, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

func (s *gatewayService) Delete(ctx context.Context, tenantID, id int64) error {
	return s.repo.Delete(ctx, tenantID, id)
}

func (s *gatewayService) Register(ctx context.Context, req *pb.RegisterRequest, peerIP string) (*pb.RegisterResponse, error) {
	tenantID, err := strconv.ParseInt(req.TenantId, 10, 64)
	if err != nil {
		return &pb.RegisterResponse{Success: false, Error: "invalid tenant ID: must be numeric"}, nil
	}
	gatewayID, err := strconv.ParseInt(req.GatewayId, 10, 64)
	if err != nil {
		return &pb.RegisterResponse{Success: false, Error: "invalid gateway ID: must be numeric"}, nil
	}

	gw, err := s.repo.GetByID(ctx, tenantID, gatewayID)
	if err != nil {
		return &pb.RegisterResponse{Success: false, Error: "gateway not found"}, nil
	}
	if gw.Token != req.GatewayToken {
		return &pb.RegisterResponse{Success: false, Error: "invalid gateway token"}, nil
	}

	if err := s.repo.UpdateStatus(ctx, tenantID, gatewayID, domain.GatewayOnline, peerIP); err != nil {
		return &pb.RegisterResponse{Success: false, Error: "failed to update status"}, nil
	}

	return &pb.RegisterResponse{
		Success:   true,
		SessionId: fmt.Sprintf("sess_%d_%d", tenantID, gatewayID),
	}, nil
}

func (s *gatewayService) Heartbeat(ctx context.Context, tenantID, gatewayID, peerIP string) error {
	tid, err := strconv.ParseInt(tenantID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid tenant ID: %s", tenantID)
	}
	gid, err := strconv.ParseInt(gatewayID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid gateway ID: %s", gatewayID)
	}
	return s.repo.UpdateStatus(ctx, tid, gid, domain.GatewayOnline, peerIP)
}

func (s *gatewayService) AddStream(tenantID, gatewayID string, stream pb.GatewayService_ConnectServer) {
	s.streams.Store(tenantID+":"+gatewayID, stream)
}

func (s *gatewayService) RemoveStream(tenantID, gatewayID string) {
	s.streams.Delete(tenantID + ":" + gatewayID)
}

func (s *gatewayService) GetStream(tenantID, gatewayID string) pb.GatewayService_ConnectServer {
	val, ok := s.streams.Load(tenantID + ":" + gatewayID)
	if !ok {
		return nil
	}
	return val.(pb.GatewayService_ConnectServer)
}
