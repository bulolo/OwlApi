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

// DataSource is a tenant-scoped database connection configuration that may
// carry separate dev and prod environments.
type DataSource struct {
	ID        int64            `json:"id"`
	TenantID  int64            `json:"tenant_id"`
	Name      string           `json:"name"`
	IsDual    bool             `json:"is_dual"`
	Type      string           `json:"type"`
	Envs      []*DataSourceEnv `json:"envs,omitempty"`
	CreatedAt time.Time        `json:"created_at"`
}

// MaskEnvs returns a shallow copy of ds with all DSN passwords replaced by
// "****". Use this before writing ds into an HTTP response.
func (ds *DataSource) MaskEnvs() *DataSource {
	masked := *ds
	masked.Envs = make([]*DataSourceEnv, len(ds.Envs))
	for i, e := range ds.Envs {
		me := *e
		me.DSN = maskDSN(e.DSN)
		masked.Envs[i] = &me
	}
	return &masked
}

// DataSourceEnv holds connection details for one environment (dev or prod).
type DataSourceEnv struct {
	ID           int64  `json:"id"`
	DataSourceID int64  `json:"datasource_id"`
	Env          string `json:"env"` // "dev" | "prod"
	DSN          string `json:"dsn,omitempty"`
	GatewayID    int64  `json:"gateway_id"`
}

// maskDSN replaces the password segment of any supported DSN format with "****".
func maskDSN(dsn string) string {
	if dsn == "" {
		return ""
	}
	// URL-style: postgres://, postgresql://, sqlserver://
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") ||
		strings.HasPrefix(dsn, "sqlserver://") {
		return maskURLPassword(dsn)
	}
	// go-sql-driver style: user:password@tcp(host)/db
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

// maskURLPassword replaces the password in a URL-style DSN (scheme://user:pass@host…).
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
