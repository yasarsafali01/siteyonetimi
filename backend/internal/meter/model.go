package meter

import (
	"time"

	"github.com/google/uuid"
)

type Meter struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenantId"`
	SiteID    uuid.UUID  `json:"siteId"`
	UnitID    *uuid.UUID `json:"unitId"`
	Type      string     `json:"type"`
	SerialNo  *string    `json:"serialNo"`
	UnitPrice float64    `json:"unitPrice"`
	IsActive  bool       `json:"isActive"`
	CreatedAt time.Time  `json:"createdAt"`
}

type Reading struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	MeterID     uuid.UUID  `json:"meterId"`
	ReadingDate time.Time  `json:"readingDate"`
	Value       float64    `json:"value"`
	CreatedBy   *uuid.UUID `json:"createdBy"`
	CreatedAt   time.Time  `json:"createdAt"`
}

// ConsumptionEntry, iki ardışık endeks okuması arasındaki tüketimi temsil eder.
type ConsumptionEntry struct {
	FromDate    time.Time `json:"fromDate"`
	ToDate      time.Time `json:"toDate"`
	FromValue   float64   `json:"fromValue"`
	ToValue     float64   `json:"toValue"`
	Consumption float64   `json:"consumption"`
}
