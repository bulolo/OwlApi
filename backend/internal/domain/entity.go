package domain

import (
	"context"
	"time"
)

// User represents a system user
type User struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Agent represents a registered gateway agent
type Agent struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Token     string    `json:"-"`
	Status    string    `json:"status"` // online, offline
	IP        string    `json:"ip"`
	LastSeen  time.Time `json:"last_seen"`
}

// AgentRepository defines interface for agent persistence
type AgentRepository interface {
	Create(ctx context.Context, agent *Agent) error
	GetByID(ctx context.Context, id string) (*Agent, error)
	UpdateStatus(ctx context.Context, id string, status string) error
}
