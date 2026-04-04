package service

import (
	"context"
	"fmt"
	"strconv"
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
	streams sync.Map // key: "tenantID:runnerID"
}

func NewRunnerService(repo domain.RunnerRepository) RunnerService {
	return &runnerService{repo: repo}
}

func (s *runnerService) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	tenantID, err := strconv.ParseInt(req.TenantId, 10, 64)
	if err != nil {
		return &pb.RegisterResponse{Success: false, Error: "Invalid tenant ID: must be numeric"}, nil
	}
	runnerID, err := strconv.ParseInt(req.NodeId, 10, 64)
	if err != nil {
		return &pb.RegisterResponse{Success: false, Error: "Invalid runner ID: must be numeric"}, nil
	}

	runner, err := s.repo.GetByID(ctx, tenantID, runnerID)
	if err != nil {
		return &pb.RegisterResponse{Success: false, Error: "Runner not found"}, nil
	}

	// Verify token
	if runner.Token != req.NodeToken {
		return &pb.RegisterResponse{Success: false, Error: "Invalid runner token"}, nil
	}

	_ = s.repo.UpdateStatus(ctx, tenantID, runnerID, "online")

	return &pb.RegisterResponse{
		Success:   true,
		SessionId: fmt.Sprintf("sess_%d_%d", tenantID, runnerID),
	}, nil
}

func (s *runnerService) Heartbeat(ctx context.Context, tenantID, id string) error {
	tid, err := strconv.ParseInt(tenantID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid tenant ID: %s", tenantID)
	}
	rid, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid runner ID: %s", id)
	}
	return s.repo.Heartbeat(ctx, tid, rid)
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
