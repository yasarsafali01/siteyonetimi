package access

import (
	"time"

	"github.com/google/uuid"
)

type Point struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	SiteID    uuid.UUID `json:"siteId"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	Location  *string   `json:"location"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

type Credential struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenantId"`
	SiteID          uuid.UUID  `json:"siteId"`
	PersonID        *uuid.UUID `json:"personId"`
	UnitID          *uuid.UUID `json:"unitId"`
	Type            string     `json:"type"`
	CredentialValue string     `json:"credentialValue"`
	IsActive        bool       `json:"isActive"`
	ValidFrom       time.Time  `json:"validFrom"`
	ValidUntil      *time.Time `json:"validUntil"`
	CreatedAt       time.Time  `json:"createdAt"`
}

type Log struct {
	ID                       uuid.UUID  `json:"id"`
	TenantID                 uuid.UUID  `json:"tenantId"`
	SiteID                   uuid.UUID  `json:"siteId"`
	AccessPointID            uuid.UUID  `json:"accessPointId"`
	CredentialID             *uuid.UUID `json:"credentialId"`
	Method                   string     `json:"method"`
	CredentialValueSnapshot  string     `json:"credentialValueSnapshot"`
	Granted                  bool       `json:"granted"`
	OccurredAt               time.Time  `json:"occurredAt"`
}
