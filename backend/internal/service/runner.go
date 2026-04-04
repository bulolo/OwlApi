package service

// TODO: Wire up with actual pb package after running `make gen-proto`.
// TODO: Align tenantID/runnerID types (string vs int64) with domain layer.

import (
	"context"
	"sync"

	"github.com/hongjunyao/owlapi/internal/domain"
	"github.com/hongjunyao/owlapi/internal/pb"
)

// RunnerService defines logic for runner management
type RunnerService interface {
	Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error)
	Heartbeat(ctx context.Context, tenantID, id string) error
	
	// Stream management
	AddStream(tenantID, runnerID string, stream pb.GatewayService_ConnectServer)
	RemoveStream(tenantID, runnerID string)
	GetStream(tenantID, runnerID string) pb.GatewayService_ConnectServer
}

type runnerService struct {
	repo    domain.RunnerRepository
	streams sync.Map // map[string]pb.GatewayService_ConnectServer
}

func NewRunnerService(repo domain.RunnerRepository) RunnerService {
	return &runnerService{
		repo:    repo,
	}
}

func (s *runnerService) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	// Simple token verification logic (placeholder)
	// In production, you'd check req.NodeToken against the DB
	runner, err := s.repo.GetByID(ctx, req.TenantId, req.NodeId)
	if err != nil {
		return &pb.RegisterResponse{Success: false, Error: "Runner not found or tenant mismatch"}, nil
	}

	// Update status and last seen
	err = s.repo.UpdateStatus(ctx, req.TenantId, req.NodeId, "online")
	if err != nil {
		return nil, err
	}

	return &pb.RegisterResponse{
		Success:   true,
		SessionId: "sess_" + req.TenantId + "_" + req.NodeId, // Placeholder session ID
	}, nil
}

func (s *runnerService) Heartbeat(ctx context.Context, tenantID, id string) error {
	return s.repo.Heartbeat(ctx, tenantID, id)
}

func (s *runnerService) AddStream(tenantID, runnerID string, stream pb.GatewayService_ConnectServer) {
	s.streams.Store(tenantID+":"+runnerID, stream)
}

func (s *runnerService) RemoveStream(tenantID, runnerID string) {
	s.streams.Delete(tenantID+":"+runnerID)
}

func (s *runnerService) GetStream(tenantID, runnerID string) pb.GatewayService_ConnectServer {
	val, ok := s.streams.Load(tenantID+":"+runnerID)
	if !ok {
		return nil
	}
	return val.(pb.GatewayService_ConnectServer)
}
