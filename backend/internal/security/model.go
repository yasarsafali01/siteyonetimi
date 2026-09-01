package security

import (
	"time"

	"github.com/google/uuid"
)

type Checkpoint struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	SiteID    uuid.UUID `json:"siteId"`
	Name      string    `json:"name"`
	Location  *string   `json:"location"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

type Patrol struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	SiteID      uuid.UUID  `json:"siteId"`
	GuardID     *uuid.UUID `json:"guardId"`
	StartedAt   time.Time  `json:"startedAt"`
	CompletedAt *time.Time `json:"completedAt"`
	Note        *string    `json:"note"`
}

type PatrolScan struct {
	ID           uuid.UUID `json:"id"`
	PatrolID     uuid.UUID `json:"patrolId"`
	CheckpointID uuid.UUID `json:"checkpointId"`
	ScannedAt    time.Time `json:"scannedAt"`
}

type Incident struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	SiteID      uuid.UUID  `json:"siteId"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Severity    string     `json:"severity"`
	CameraNote  *string    `json:"cameraNote"`
	OccurredAt  time.Time  `json:"occurredAt"`
	ReportedBy  *uuid.UUID `json:"reportedBy"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type Shift struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenantId"`
	SiteID    uuid.UUID  `json:"siteId"`
	GuardID   *uuid.UUID `json:"guardId"`
	ShiftDate time.Time  `json:"shiftDate"`
	StartTime string     `json:"startTime"`
	EndTime   string     `json:"endTime"`
	CreatedAt time.Time  `json:"createdAt"`
}
