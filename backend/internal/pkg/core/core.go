package core

// Common types and constants can be defined here
// e.g. Context keys, Error definitions, etc.

type ContextKey string

const (
	RequestIDKey ContextKey = "request_id"
	UserIDKey    ContextKey = "user_id"
)
