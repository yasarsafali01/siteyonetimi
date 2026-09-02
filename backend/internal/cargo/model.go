package cargo

import (
	"time"

	"github.com/google/uuid"
)

type Delivery struct {
	ID                 uuid.UUID  `json:"id"`
	TenantID           uuid.UUID  `json:"tenantId"`
	SiteID             uuid.UUID  `json:"siteId"`
	UnitID             *uuid.UUID `json:"unitId"`
	RecipientPersonID  *uuid.UUID `json:"recipientPersonId"`
	CourierCompany     *string    `json:"courierCompany"`
	TrackingNo         *string    `json:"trackingNo"`
	Description        *string    `json:"description"`
	Status             string     `json:"status"`
	ReceivedAt         time.Time  `json:"receivedAt"`
	ReceivedBy         *uuid.UUID `json:"receivedBy"`
	DeliveredAt        *time.Time `json:"deliveredAt"`
	DeliveredTo        *string    `json:"deliveredTo"`
	NotifiedAt         *time.Time `json:"notifiedAt"`
	CreatedAt          time.Time  `json:"createdAt"`
}
