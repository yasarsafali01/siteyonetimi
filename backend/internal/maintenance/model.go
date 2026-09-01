package maintenance

import (
	"time"

	"github.com/google/uuid"
)

type Facility struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	SiteID    uuid.UUID `json:"siteId"`
	Type      string    `json:"type"`
	Name      string    `json:"name"`
	Location  *string   `json:"location"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

type Plan struct {
	ID            uuid.UUID `json:"id"`
	TenantID      uuid.UUID `json:"tenantId"`
	FacilityID    uuid.UUID `json:"facilityId"`
	Title         string    `json:"title"`
	FrequencyDays int       `json:"frequencyDays"`
	NextDueDate   time.Time `json:"nextDueDate"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
}

type WorkOrder struct {
	ID             uuid.UUID  `json:"id"`
	TenantID       uuid.UUID  `json:"tenantId"`
	SiteID         uuid.UUID  `json:"siteId"`
	FacilityID     *uuid.UUID `json:"facilityId"`
	PlanID         *uuid.UUID `json:"planId"`
	Title          string     `json:"title"`
	Description    *string    `json:"description"`
	Status         string     `json:"status"`
	ScheduledDate  *time.Time `json:"scheduledDate"`
	CompletedAt    *time.Time `json:"completedAt"`
	CompletionNote *string    `json:"completionNote"`
	AssignedTo     *uuid.UUID `json:"assignedTo"`
	CreatedBy      *uuid.UUID `json:"createdBy"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}
