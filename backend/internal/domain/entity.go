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

// Runner represents a registered Gateway Runner node
type Runner struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	Name      string    `json:"name"`
	Token     string    `json:"-"`
	Status    string    `json:"status"` // online, offline
	IP        string    `json:"ip"`
	LastSeen  time.Time `json:"last_seen"`
	Version   string    `json:"version"`
}

// DataSource represents a database connection definition
type DataSource struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	ProjectID string    `json:"project_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"` // mysql, postgres, oracle
	DSN       string    `json:"-"`    // Encrypted if needed
	CreatedAt time.Time `json:"created_at"`
}

// APIEndpoint defines a SQL-to-API mapping
type APIEndpoint struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	ProjectID    string    `json:"project_id"`
	Path         string    `json:"path"`
	Methods      []string  `json:"methods"`
	DataSourceID string    `json:"datasource_id"`
	SQL          string    `json:"sql"`
	Params       []string  `json:"params"`
	CreatedAt    time.Time `json:"created_at"`
}

// AIProxyConfig defines a proxy to a local LLM
type AIProxyConfig struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	ProjectID string    `json:"project_id"`
	Name      string    `json:"name"`
	Model     string    `json:"model"`
	Endpoint  string    `json:"endpoint"`
	CreatedAt time.Time `json:"created_at"`
}

// RunnerRepository defines interface for runner persistence
type RunnerRepository interface {
	Create(ctx context.Context, runner *Runner) error
	GetByID(ctx context.Context, tenantID, id string) (*Runner, error)
	UpdateStatus(ctx context.Context, tenantID, id string, status string) error
	Heartbeat(ctx context.Context, tenantID, id string) error
}

// ProjectRepository defines interface for project and resource management
type ProjectRepository interface {
	GetDataSourceByID(ctx context.Context, tenantID, id string) (*DataSource, error)
	GetAPIEndpointByPath(ctx context.Context, tenantID, path string) (*APIEndpoint, error)
	GetAIProxyConfigByID(ctx context.Context, tenantID, id string) (*AIProxyConfig, error)
}
