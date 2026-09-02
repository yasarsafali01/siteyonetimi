package auth

import "github.com/google/uuid"

type User struct {
	ID           uuid.UUID  `json:"id"`
	TenantID     uuid.UUID  `json:"tenantId"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"`
	FullName     string     `json:"fullName"`
	IsSuperAdmin bool       `json:"isSuperAdmin"`
	IsActive     bool       `json:"isActive"`
	UserType     string     `json:"userType"`
	PersonID     *uuid.UUID `json:"personId"`
}
