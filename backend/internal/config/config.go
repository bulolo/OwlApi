package config

import (
	"os"
)

// Config holds the configuration for both Server and Gateway
type Config struct {
	// Common
	LogLevel string

	// Gateway Specific
	ServerURL    string
	GatewayID    string
	GatewayToken string
	TenantID     string

	// Server Specific
	HTTPPort    string
	GRPCPort    string
	DatabaseURL string
	JWTSecret   string
}

// LoadFromEnv loads configuration from environment variables
func LoadFromEnv() *Config {
	return &Config{
		LogLevel: getEnv("OWLAPI_LOG_LEVEL", "info"),

		ServerURL:    getEnv("OWLAPI_SERVER_URL", "dns:///localhost:9090"),
		GatewayID:    getEnv("OWLAPI_GATEWAY_ID", ""),
		GatewayToken: getEnv("OWLAPI_GATEWAY_TOKEN", ""),
		TenantID:     getEnv("OWLAPI_TENANT_ID", "1"),

		HTTPPort:    getEnv("OWLAPI_HTTP_PORT", ":3000"),
		GRPCPort:    getEnv("OWLAPI_GRPC_PORT", ":9090"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/owlapi?sslmode=disable"),
		JWTSecret:   getEnv("OWLAPI_JWT_SECRET", "owlapi-dev-secret-change-me"),
	}
}

// Helper to get env string with default
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
