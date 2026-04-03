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
	ID        int64        `json:"id"`
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
	RoleAdmin  UserRole = "Admin"
	RoleViewer UserRole = "Viewer"
)

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	PasswordHash string    `json:"-"`
	IsSuperAdmin bool      `json:"is_superadmin"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// TenantUser represents a user's association with a tenant
type TenantUser struct {
	TenantID int64    `json:"tenant_id"`
	UserID   int64    `json:"user_id"`
	Role     UserRole `json:"role"`
	JoinedAt time.Time `json:"joined_at"`

	// Populated on query
	User   *User   `json:"user,omitempty"`
	Tenant *Tenant `json:"tenant,omitempty"`
}

// ==================== Runner (Gateway Node) ====================

type Runner struct {
	ID       int64     `json:"id"`
	TenantID int64     `json:"tenant_id"`
	Name     string    `json:"name"`
	Token    string    `json:"-"`
	Status   string    `json:"status"`
	IP       string    `json:"ip"`
	LastSeen time.Time `json:"last_seen"`
	Version  string    `json:"version"`
}

// ==================== DataSource ====================

type DataSource struct {
	ID        int64     `json:"id"`
	TenantID  int64     `json:"tenant_id"`
	ProjectID int64     `json:"project_id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	DSN       string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

// ==================== Project & API ====================

type Project struct {
	ID          int64     `json:"id"`
	TenantID    int64     `json:"tenant_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type APIEndpoint struct {
	ID           int64    `json:"id"`
	TenantID     int64    `json:"tenant_id"`
	ProjectID    int64    `json:"project_id"`
	Path         string   `json:"path"`
	Methods      []string `json:"methods"`
	DataSourceID int64    `json:"datasource_id"`
	SQL          string   `json:"sql"`
	Params       []string `json:"params"`
	CreatedAt    time.Time `json:"created_at"`
}

// ==================== Repository Interfaces ====================

type TenantRepository interface {
	Create(ctx context.Context, tenant *Tenant) error
	GetByID(ctx context.Context, id int64) (*Tenant, error)
	GetBySlug(ctx context.Context, slug string) (*Tenant, error)
	List(ctx context.Context, page, size int) ([]*Tenant, int, error)
	Update(ctx context.Context, tenant *Tenant) error
	Delete(ctx context.Context, id int64) error
}

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id int64) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
}

type TenantUserRepository interface {
	Add(ctx context.Context, tu *TenantUser) error
	Remove(ctx context.Context, tenantID, userID int64) error
	GetByTenantID(ctx context.Context, tenantID int64, page, size int) ([]*TenantUser, int, error)
	GetByUserID(ctx context.Context, userID int64) ([]*TenantUser, error)
	GetByTenantAndUser(ctx context.Context, tenantID, userID int64) (*TenantUser, error)
	UpdateRole(ctx context.Context, tenantID, userID int64, role UserRole) error
}

type RunnerRepository interface {
	Create(ctx context.Context, runner *Runner) error
	GetByID(ctx context.Context, tenantID, id int64) (*Runner, error)
	UpdateStatus(ctx context.Context, tenantID, id int64, status string) error
	Heartbeat(ctx context.Context, tenantID, id int64) error
}

type ProjectRepository interface {
	GetDataSourceByID(ctx context.Context, tenantID, id int64) (*DataSource, error)
	GetAPIEndpointByPath(ctx context.Context, tenantID int64, path string) (*APIEndpoint, error)
}
