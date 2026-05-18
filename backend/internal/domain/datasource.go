package domain

import (
	"strings"
	"time"
)

// DbType enumerates supported database driver types.
type DbType string

const (
	DbTypeMySQL     DbType = "mysql"
	DbTypePostgres  DbType = "postgres"
	DbTypeSQLServer DbType = "sqlserver"
	DbTypeStarRocks DbType = "starrocks"
	DbTypeDoris     DbType = "doris"
	DbTypeSQLite    DbType = "sqlite"
)

// IsValid reports whether t is a supported database type.
func (t DbType) IsValid() bool {
	switch t {
	case DbTypeMySQL, DbTypePostgres, DbTypeSQLServer, DbTypeStarRocks, DbTypeDoris, DbTypeSQLite:
		return true
	}
	return false
}

// DataSource is a tenant-scoped database connection — a single physical connection.
// Multi-environment support lives at the project layer (project_environments +
// endpoint_datasource_bindings), so the same logical database in dev/prod becomes
// two independent DataSource rows.
type DataSource struct {
	ID         int64     `json:"id"`
	TenantID   int64     `json:"tenant_id"`
	Name       string    `json:"name"`
	IsPlatform bool      `json:"is_platform"`
	Type       string    `json:"type"`
	DSN        string    `json:"dsn,omitempty"`
	GatewayID  int64     `json:"gateway_id"`
	CreatedAt  time.Time `json:"created_at"`
}

// Masked returns a copy of ds with the DSN password replaced by "****".
// Use this before writing ds into an HTTP response.
func (ds *DataSource) Masked() *DataSource {
	m := *ds
	m.DSN = maskDSN(ds.DSN)
	return &m
}

// maskDSN replaces the password segment of any supported DSN format with "****".
func maskDSN(dsn string) string {
	if dsn == "" {
		return ""
	}
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") ||
		strings.HasPrefix(dsn, "sqlserver://") {
		return maskURLPassword(dsn)
	}
	atIdx := strings.LastIndex(dsn, "@")
	if atIdx < 0 {
		return dsn
	}
	creds := dsn[:atIdx]
	rest := dsn[atIdx:]
	colonIdx := strings.Index(creds, ":")
	if colonIdx < 0 {
		return dsn
	}
	return creds[:colonIdx+1] + "****" + rest
}

func maskURLPassword(rawURL string) string {
	schemeEnd := strings.Index(rawURL, "://")
	if schemeEnd < 0 {
		return rawURL
	}
	after := rawURL[schemeEnd+3:]
	atIdx := strings.LastIndex(after, "@")
	if atIdx < 0 {
		return rawURL
	}
	creds := after[:atIdx]
	colonIdx := strings.Index(creds, ":")
	if colonIdx < 0 {
		return rawURL
	}
	return rawURL[:schemeEnd+3] + creds[:colonIdx+1] + "****" + after[atIdx:]
}
