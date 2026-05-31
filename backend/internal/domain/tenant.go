package domain

import "time"

type TenantStatus string

const (
	TenantActive    TenantStatus = "Active"
	TenantSuspended TenantStatus = "Suspended"
)

// 注：订阅档位 plan（含 Demo）属 EE 概念，类型与常量已移至 internal/ee/platform；
// 核心租户只保留身份字段 + status（基础生命周期）。
type Tenant struct {
	ID                 int64        `json:"id"`
	Name               string       `json:"name"`
	Slug               string       `json:"slug"`
	Status             TenantStatus `json:"status"`
	MaxReleaseVersions int          `json:"max_release_versions"`
	Avatar             string       `json:"avatar"`
	CreatedAt          time.Time    `json:"created_at"`
	UpdatedAt          time.Time    `json:"updated_at"`

	// IsDemo 为运行时计算字段（非持久化列）：GetTenant 经 EE demoChecker 填充（查 tenant_ee_configs.plan==Demo）；
	// CE / 未注册 checker 时恒 false。供前端 DemoBanner 判定。
	IsDemo bool `json:"is_demo"`
}

type TenantUser struct {
	TenantID int64     `json:"tenant_id"`
	UserID   int64     `json:"user_id"`
	Role     UserRole  `json:"role"`
	JoinedAt time.Time `json:"joined_at"`

	// Populated on query
	User   *User   `json:"user,omitempty"`
	Tenant *Tenant `json:"tenant,omitempty"`
}
