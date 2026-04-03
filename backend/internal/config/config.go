package config

import (
	"os"
	"strconv"
)

// Config holds the configuration for both Server and Runner
type Config struct {
	// Common
	LogLevel   string
	LogConsole bool

	// Runner Specific
	ServerURL   string
	RunnerID    string
	RunnerToken string
	TenantID    string
	
	// Server Specific
	HTTPPort    string
	GRPCPort    string
	DatabaseURL string
	JWTSecret   string
}

// LoadFromEnv loads configuration from environment variables
func LoadFromEnv() *Config {
	return &Config{
		LogLevel:   getEnv("OWLAPI_LOG_LEVEL", "info"),
		LogConsole: getEnvAsBool("OWLAPI_LOG_CONSOLE", true),
		
		ServerURL:   getEnv("OWLAPI_SERVER_URL", "dns:///localhost:9090"),
		RunnerID:    getEnv("OWLAPI_RUNNER_ID", ""),
		RunnerToken: getEnv("OWLAPI_RUNNER_TOKEN", ""),
		TenantID:    getEnv("OWLAPI_TENANT_ID", "default"),
		
		HTTPPort:    getEnv("OWLAPI_HTTP_PORT", ":3000"),
		GRPCPort:    getEnv("OWLAPI_GRPC_PORT", ":9090"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/owlapi?sslmode=disable"),
		JWTSecret:   getEnv("OWLAPI_JWT_SECRET", "owlapi-dev-secret-change-me"),
	}
}

// Helper to get env string with fallback
func getEnvWithFallback(primary, fallback, defaultValue string) string {
	if value, exists := os.LookupEnv(primary); exists {
		return value
	}
	if value, exists := os.LookupEnv(fallback); exists {
		return value
	}
	return defaultValue
}

// Helper to get env string with default
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// Helper to get env bool with default
func getEnvAsBool(key string, fallback bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		b, err := strconv.ParseBool(value)
		if err == nil {
			return b
		}
	}
	return fallback
}
