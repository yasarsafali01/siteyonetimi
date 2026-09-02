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

// Residency, sakin tipi bir kullanıcının malik/kiracı olduğu bağımsız bölümü
// site/blok bağlamıyla birlikte taşır — sakin panelinin tek çağrıda ihtiyaç
// duyduğu bilgi.
type Residency struct {
	UnitID     uuid.UUID `json:"unitId"`
	UnitNumber string    `json:"unitNumber"`
	BlockID    uuid.UUID `json:"blockId"`
	BlockName  string    `json:"blockName"`
	SiteID     uuid.UUID `json:"siteId"`
	SiteName   string    `json:"siteName"`
	Relation   string    `json:"relation"`
}

type Me struct {
	ID           uuid.UUID   `json:"id"`
	Email        string      `json:"email"`
	FullName     string      `json:"fullName"`
	UserType     string      `json:"userType"`
	IsSuperAdmin bool        `json:"isSuperAdmin"`
	PersonID     *uuid.UUID  `json:"personId"`
	PersonName   *string     `json:"personName"`
	Residencies  []Residency `json:"residencies"`
}
