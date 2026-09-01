package auth

import "github.com/google/uuid"

type User struct {
	ID           uuid.UUID
	TenantID     uuid.UUID
	Email        string
	PasswordHash string
	FullName     string
	IsSuperAdmin bool
	IsActive     bool
}
