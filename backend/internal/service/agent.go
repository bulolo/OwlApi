package service

import (
	"context"

	"github.com/hongjunyao/owlapi/internal/domain"
)

// AgentService defines logic for agent management
type AgentService interface {
	Register(ctx context.Context, id, name string) (*domain.Agent, error)
	Heartbeat(ctx context.Context, id string) error
}

type agentService struct {
	repo domain.AgentRepository
}

func NewAgentService(repo domain.AgentRepository) AgentService {
	return &agentService{repo: repo}
}

func (s *agentService) Register(ctx context.Context, id, name string) (*domain.Agent, error) {
	// Business logic here
	return &domain.Agent{ID: id, Name: name}, nil
}

func (s *agentService) Heartbeat(ctx context.Context, id string) error {
	return nil
}
