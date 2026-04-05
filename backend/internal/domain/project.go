package domain

import "time"

type Project struct {
	ID           int64     `json:"id"`
	TenantID     int64     `json:"tenant_id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	DataSourceID int64     `json:"datasource_id"`
	CreatedAt    time.Time `json:"created_at"`
}

type DataSource struct {
	ID        int64            `json:"id"`
	TenantID  int64            `json:"tenant_id"`
	Name      string           `json:"name"`
	IsDual    bool             `json:"is_dual"`
	Type      string           `json:"type"`
	Envs      []*DataSourceEnv `json:"envs,omitempty"`
	CreatedAt time.Time        `json:"created_at"`
}

type DataSourceEnv struct {
	ID           int64  `json:"id"`
	DataSourceID int64  `json:"datasource_id"`
	Env          string `json:"env"` // dev, prod
	DSN          string `json:"dsn,omitempty"`
	GatewayID    int64  `json:"gateway_id"`
}

type APIEndpoint struct {
	ID        int64     `json:"id"`
	TenantID  int64     `json:"tenant_id"`
	ProjectID int64     `json:"project_id"`
	Path      string    `json:"path"`
	Methods   []string  `json:"methods"`
	SQL       string    `json:"sql"`
	Params    []string  `json:"params"`
	CreatedAt time.Time `json:"created_at"`
}
