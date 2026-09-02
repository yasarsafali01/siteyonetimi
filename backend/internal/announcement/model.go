package announcement

import (
	"time"

	"github.com/google/uuid"
)

type Announcement struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenantId"`
	SiteID        uuid.UUID  `json:"siteId"`
	Title         string     `json:"title"`
	Content       string     `json:"content"`
	Category      string     `json:"category"`
	TargetBlockID *uuid.UUID `json:"targetBlockId"`
	Channels      []string   `json:"channels"`
	PublishedBy   *uuid.UUID `json:"publishedBy"`
	PublishedAt   time.Time  `json:"publishedAt"`
	CreatedAt     time.Time  `json:"createdAt"`
}
