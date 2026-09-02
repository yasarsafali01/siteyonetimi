package parking

import (
	"time"

	"github.com/google/uuid"
)

type Spot struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenantId"`
	SiteID     uuid.UUID  `json:"siteId"`
	SpotNumber string     `json:"spotNumber"`
	SpotType   string     `json:"spotType"`
	UnitID     *uuid.UUID `json:"unitId"`
	IsActive   bool       `json:"isActive"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type VehicleRecord struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenantId"`
	SiteID    uuid.UUID  `json:"siteId"`
	SpotID    *uuid.UUID `json:"spotId"`
	Plate     string     `json:"plate"`
	OwnerType string     `json:"ownerType"`
	UnitID    *uuid.UUID `json:"unitId"`
	EnteredAt time.Time  `json:"enteredAt"`
	ExitedAt  *time.Time `json:"exitedAt"`
	CreatedAt time.Time  `json:"createdAt"`
}

type Reservation struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenantId"`
	SiteID     uuid.UUID  `json:"siteId"`
	SpotID     uuid.UUID  `json:"spotId"`
	UnitID     *uuid.UUID `json:"unitId"`
	ReservedBy *uuid.UUID `json:"reservedBy"`
	StartTime  time.Time  `json:"startTime"`
	EndTime    time.Time  `json:"endTime"`
	Status     string     `json:"status"`
	CreatedAt  time.Time  `json:"createdAt"`
}
