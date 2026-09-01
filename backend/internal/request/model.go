package request

import (
	"time"

	"github.com/google/uuid"
)

type Request struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	SiteID      uuid.UUID  `json:"siteId"`
	UnitID      *uuid.UUID `json:"unitId"`
	ReportedBy  *uuid.UUID `json:"reportedBy"`
	Type        string     `json:"type"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Priority    string     `json:"priority"`
	Status      string     `json:"status"`
	AssignedTo  *uuid.UUID `json:"assignedTo"`
	SLADueAt    *time.Time `json:"slaDueAt"`
	CreatedBy   *uuid.UUID `json:"createdBy"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

type Attachment struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	RequestID   uuid.UUID  `json:"requestId"`
	FileName    string     `json:"fileName"`
	FileURL     string     `json:"fileUrl"`
	ContentType *string    `json:"contentType"`
	UploadedBy  *uuid.UUID `json:"uploadedBy"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type StatusChange struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenantId"`
	RequestID  uuid.UUID  `json:"requestId"`
	FromStatus *string    `json:"fromStatus"`
	ToStatus   string     `json:"toStatus"`
	Note       *string    `json:"note"`
	ChangedBy  *uuid.UUID `json:"changedBy"`
	CreatedAt  time.Time  `json:"createdAt"`
}
