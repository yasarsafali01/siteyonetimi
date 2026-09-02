package document

import (
	"time"

	"github.com/google/uuid"
)

type Document struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	SiteID      uuid.UUID  `json:"siteId"`
	Category    string     `json:"category"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	FileURL     string     `json:"fileUrl"`
	ValidUntil  *time.Time `json:"validUntil"`
	UploadedBy  *uuid.UUID `json:"uploadedBy"`
	CreatedAt   time.Time  `json:"createdAt"`
}
