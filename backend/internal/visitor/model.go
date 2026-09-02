package visitor

import (
	"time"

	"github.com/google/uuid"
)

type Invitation struct {
	ID             uuid.UUID  `json:"id"`
	TenantID       uuid.UUID  `json:"tenantId"`
	SiteID         uuid.UUID  `json:"siteId"`
	UnitID         *uuid.UUID `json:"unitId"`
	HostPersonID   *uuid.UUID `json:"hostPersonId"`
	VisitorName    string     `json:"visitorName"`
	VisitorPhone   *string    `json:"visitorPhone"`
	VehiclePlate   *string    `json:"vehiclePlate"`
	InvitationCode string     `json:"invitationCode"`
	ValidFrom      time.Time  `json:"validFrom"`
	ValidUntil     time.Time  `json:"validUntil"`
	Status         string     `json:"status"`
	ApprovedBy     *uuid.UUID `json:"approvedBy"`
	ApprovedAt     *time.Time `json:"approvedAt"`
	CreatedBy      *uuid.UUID `json:"createdBy"`
	CreatedAt      time.Time  `json:"createdAt"`
}

type Log struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenantId"`
	SiteID        uuid.UUID  `json:"siteId"`
	UnitID        *uuid.UUID `json:"unitId"`
	InvitationID  *uuid.UUID `json:"invitationId"`
	VisitorName   string     `json:"visitorName"`
	VisitorPhone  *string    `json:"visitorPhone"`
	IDNumber      *string    `json:"idNumber"`
	VehiclePlate  *string    `json:"vehiclePlate"`
	TempCardNo    *string    `json:"tempCardNo"`
	CheckedInAt   time.Time  `json:"checkedInAt"`
	CheckedInBy   *uuid.UUID `json:"checkedInBy"`
	CheckedOutAt  *time.Time `json:"checkedOutAt"`
	CheckedOutBy  *uuid.UUID `json:"checkedOutBy"`
	Note          *string    `json:"note"`
}
