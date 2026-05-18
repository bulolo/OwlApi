package domain

import "time"

// ProjectEnvironment is a logical environment scoped to a project (e.g. "dev", "prod").
// Every project has at least one (the default, typically "prod") created on project creation.
type ProjectEnvironment struct {
	ID        int64     `json:"id"`
	TenantID  int64     `json:"tenant_id"`
	ProjectID int64     `json:"project_id"`
	Name      string    `json:"name"`
	IsDefault bool      `json:"is_default"`
	CreatedAt time.Time `json:"created_at"`
}

// EndpointDatasourceBinding maps a logical alias (e.g. "main", "analytics") to a
// concrete DataSource within one environment. Endpoints reference aliases, not
// datasource IDs, so the same endpoint runs against different physical databases
// depending on the env the call landed on.
type EndpointDatasourceBinding struct {
	TenantID     int64  `json:"tenant_id"`
	EnvID        int64  `json:"env_id"`
	Alias        string `json:"alias"`
	DataSourceID int64  `json:"datasource_id"`
}
