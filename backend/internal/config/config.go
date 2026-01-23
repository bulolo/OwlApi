package config

import (
	"os"
	"strconv"
)

// Config holds the configuration for both Server and Agent
type Config struct {
	// Common
	LogLevel   string
	LogConsole bool

	// Agent Specific
	ServerURL  string
	AgentID    string
	AgentToken string
	
	// Server Specific (Example)
	HTTPPort string
	GRPCPort string
}

// LoadFromEnv loads configuration from environment variables
func LoadFromEnv() *Config {
	return &Config{
		LogLevel:   getEnv("OWLAPI_LOG_LEVEL", "info"),
		LogConsole: getEnvAsBool("OWLAPI_LOG_CONSOLE", true),
		
		ServerURL:  getEnv("OWLAPI_SERVER_URL", "dns:///localhost:9090"), // 使用 dns:/// 支持负载均衡
		AgentID:    getEnv("OWLAPI_AGENT_ID", ""),
		AgentToken: getEnv("OWLAPI_AGENT_TOKEN", ""),
		
		HTTPPort: getEnv("OWLAPI_HTTP_PORT", ":8080"),
		GRPCPort: getEnv("OWLAPI_GRPC_PORT", ":9090"),
	}
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
