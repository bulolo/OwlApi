package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
)

// ServerConfig holds configuration for the Control Plane (HTTP + gRPC server).
type ServerConfig struct {
	LogLevel            string
	HTTPPort            string
	GRPCPort            string
	DatabaseURL         string
	JWTSecret           string
	CORSOrigin          string
	QueryTimeoutSeconds int // client-side wait timeout (should be slightly > gateway QueryTimeout)
}

// GatewayConfig holds configuration for the Gateway agent binary.
type GatewayConfig struct {
	LogLevel            string
	ServerURL           string
	GatewayID           string
	GatewayToken        string
	TenantID            string
	QueryTimeoutSeconds int // timeout for SQL query execution on gateway side
	JSTimeoutSeconds    int // timeout for JS pre/post script execution
}

func LoadServerConfig() *ServerConfig {
	queryTimeout, _ := strconv.Atoi(getEnv("OWLAPI_QUERY_TIMEOUT_SECONDS", "30"))
	if queryTimeout <= 0 {
		queryTimeout = 30
	}
	cfg := &ServerConfig{
		LogLevel:            getEnv("OWLAPI_LOG_LEVEL", "info"),
		HTTPPort:            getEnv("OWLAPI_HTTP_PORT", ":3000"),
		GRPCPort:            getEnv("OWLAPI_GRPC_PORT", ":9090"),
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/owlapi?sslmode=disable"),
		JWTSecret:           getEnv("OWLAPI_JWT_SECRET", ""),
		CORSOrigin:          getEnv("OWLAPI_CORS_ORIGIN", "*"),
		QueryTimeoutSeconds: queryTimeout,
	}
	if cfg.JWTSecret == "" {
		slog.Warn("OWLAPI_JWT_SECRET not set, using insecure default (DO NOT use in production)")
		cfg.JWTSecret = "owlapi-dev-secret-change-me"
	}
	return cfg
}

func LoadGatewayConfig() *GatewayConfig {
	queryTimeout, _ := strconv.Atoi(getEnv("OWLAPI_QUERY_TIMEOUT_SECONDS", "30"))
	jsTimeout, _ := strconv.Atoi(getEnv("OWLAPI_JS_TIMEOUT_SECONDS", "5"))
	if queryTimeout <= 0 {
		queryTimeout = 30
	}
	if jsTimeout <= 0 {
		jsTimeout = 5
	}
	return &GatewayConfig{
		LogLevel:            getEnv("OWLAPI_LOG_LEVEL", "info"),
		ServerURL:           getEnv("OWLAPI_SERVER_URL", "dns:///localhost:9090"),
		GatewayID:           getEnv("OWLAPI_GATEWAY_ID", ""),
		GatewayToken:        getEnv("OWLAPI_GATEWAY_TOKEN", ""),
		TenantID:            getEnv("OWLAPI_TENANT_ID", "1"),
		QueryTimeoutSeconds: queryTimeout,
		JSTimeoutSeconds:    jsTimeout,
	}
}

// Validate returns an error if the config is not suitable for production use.
func (c *ServerConfig) Validate() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("OWLAPI_JWT_SECRET must be at least 32 characters (current: %d)", len(c.JWTSecret))
	}
	return nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
