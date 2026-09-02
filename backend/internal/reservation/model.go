package reservation

import (
	"time"

	"github.com/google/uuid"
)

type FacilityReservation struct {
	ID           uuid.UUID  `json:"id"`
	TenantID     uuid.UUID  `json:"tenantId"`
	SiteID       uuid.UUID  `json:"siteId"`
	CommonAreaID uuid.UUID  `json:"commonAreaId"`
	UnitID       *uuid.UUID `json:"unitId"`
	PersonID     *uuid.UUID `json:"personId"`
	ReservedBy   *uuid.UUID `json:"reservedBy"`
	StartTime    time.Time  `json:"startTime"`
	EndTime      time.Time  `json:"endTime"`
	Status       string     `json:"status"`
	Note         *string    `json:"note"`
	DecidedBy    *uuid.UUID `json:"decidedBy"`
	DecidedAt    *time.Time `json:"decidedAt"`
	CreatedAt    time.Time  `json:"createdAt"`
}
