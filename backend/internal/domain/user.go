package domain

import "time"

type UserRole string

const (
	RoleAdmin  UserRole = "Admin"
	RoleViewer UserRole = "Viewer"
)

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	PasswordHash string    `json:"-"`
	IsSuperAdmin bool      `json:"is_superadmin"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
