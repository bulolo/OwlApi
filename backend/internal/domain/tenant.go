package domain

import "time"

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

type TenantUser struct {
	TenantID int64    `json:"tenant_id"`
	UserID   int64    `json:"user_id"`
	Role     UserRole `json:"role"`
	JoinedAt time.Time `json:"joined_at"`

	// Populated on query
	User   *User   `json:"user,omitempty"`
	Tenant *Tenant `json:"tenant,omitempty"`
}
