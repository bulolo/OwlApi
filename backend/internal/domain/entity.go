package domain

import (
	"context"
	"time"
)

// ==================== Tenant ====================

type TenantPlan string
type TenantStatus string

const (
	PlanFree       TenantPlan = "Free"
	PlanPro        TenantPlan = "Pro"
	PlanEnterprise TenantPlan = "Enterprise"

	TenantActive    TenantStatus = "Active"
	TenantWarning   TenantStatus = "Warning"
	TenantSuspended TenantStatus = "Suspended"
)

type Tenant struct {
	ID        string       `json:"id"`
	Name      string       `json:"name"`
	Slug      string       `json:"slug"`
	Plan      TenantPlan   `json:"plan"`
	Status    TenantStatus `json:"status"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

// ==================== User ====================

type UserRole string

const (
	RoleAdmin     UserRole = "Admin"
	RoleDeveloper UserRole = "Developer"
	RoleViewer    UserRole = "Viewer"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// TenantMember represents a user's membership in a tenant
type TenantMember struct {
	TenantID  string    `json:"tenant_id"`
	UserID    string    `json:"user_id"`
	Role      UserRole  `json:"role"`
	JoinedAt  time.Time `json:"joined_at"`

	// Populated on query
	User   *User   `json:"user,omitempty"`
	Tenant *Tenant `json:"tenant,omitempty"`
}

// ==================== Runner (Gateway Node) ====================

type Runner struct {
	ID       string    `json:"id"`
	TenantID string    `json:"tenant_id"`
	Name     string    `json:"name"`
	Token    string    `json:"-"`
	Status   string    `json:"status"` // online, offline
	IP       string    `json:"ip"`
	LastSeen time.Time `json:"last_seen"`
	Version  string    `json:"version"`
}

// ==================== DataSource ====================

type DataSource struct {
	ID        string    `json:"id"`
	TenantID  string    `json:"tenant_id"`
	ProjectID string    `json:"project_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"` // mysql, postgres, oracle, starrocks
	DSN       string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

// ==================== Project & API ====================

type Project struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenant_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type APIEndpoint struct {
	ID           string   `json:"id"`
	TenantID     string   `json:"tenant_id"`
	ProjectID    string   `json:"project_id"`
	Path         string   `json:"path"`
	Methods      []string `json:"methods"`
	DataSourceID string   `json:"datasource_id"`
	SQL          string   `json:"sql"`
	Params       []string `json:"params"`
	CreatedAt    time.Time `json:"created_at"`
}

// ==================== Repository Interfaces ====================

type TenantRepository interface {
	Create(ctx context.Context, tenant *Tenant) error
	GetByID(ctx context.Context, id string) (*Tenant, error)
	GetBySlug(ctx context.Context, slug string) (*Tenant, error)
	List(ctx context.Context) ([]*Tenant, error)
	Update(ctx context.Context, tenant *Tenant) error
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
}

type TenantMemberRepository interface {
	Add(ctx context.Context, member *TenantMember) error
	Remove(ctx context.Context, tenantID, userID string) error
	GetByTenantID(ctx context.Context, tenantID string) ([]*TenantMember, error)
	GetByUserID(ctx context.Context, userID string) ([]*TenantMember, error)
	GetMembership(ctx context.Context, tenantID, userID string) (*TenantMember, error)
	UpdateRole(ctx context.Context, tenantID, userID string, role UserRole) error
}

type RunnerRepository interface {
	Create(ctx context.Context, runner *Runner) error
	GetByID(ctx context.Context, tenantID, id string) (*Runner, error)
	UpdateStatus(ctx context.Context, tenantID, id string, status string) error
	Heartbeat(ctx context.Context, tenantID, id string) error
}

type ProjectRepository interface {
	GetDataSourceByID(ctx context.Context, tenantID, id string) (*DataSource, error)
	GetAPIEndpointByPath(ctx context.Context, tenantID, path string) (*APIEndpoint, error)
}
