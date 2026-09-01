package inventory

import (
	"time"

	"github.com/google/uuid"
)

type Asset struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenantId"`
	SiteID          uuid.UUID  `json:"siteId"`
	Name            string     `json:"name"`
	SerialNo        *string    `json:"serialNo"`
	Category        *string    `json:"category"`
	PurchaseDate    *time.Time `json:"purchaseDate"`
	PurchasePrice   *float64   `json:"purchasePrice"`
	UsefulLifeYears *int       `json:"usefulLifeYears"`
	WarrantyUntil   *time.Time `json:"warrantyUntil"`
	Status          string     `json:"status"`
	AssignedTo      *uuid.UUID `json:"assignedTo"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// Depreciation, doğrusal amortisman hesabının sonucudur.
type Depreciation struct {
	AssetID           uuid.UUID `json:"assetId"`
	PurchasePrice     float64   `json:"purchasePrice"`
	UsefulLifeYears   int       `json:"usefulLifeYears"`
	AnnualAmount      float64   `json:"annualAmount"`
	AgeYears          float64   `json:"ageYears"`
	AccumulatedAmount float64   `json:"accumulatedAmount"`
	BookValue         float64   `json:"bookValue"`
}

type Assignment struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenantId"`
	AssetID    uuid.UUID  `json:"assetId"`
	AssignedTo uuid.UUID  `json:"assignedTo"`
	AssignedAt time.Time  `json:"assignedAt"`
	ReturnedAt *time.Time `json:"returnedAt"`
	Note       *string    `json:"note"`
	CreatedBy  *uuid.UUID `json:"createdBy"`
}

type Count struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenantId"`
	SiteID    uuid.UUID  `json:"siteId"`
	CountDate time.Time  `json:"countDate"`
	Note      *string    `json:"note"`
	CreatedBy *uuid.UUID `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
}

type CountItem struct {
	ID      uuid.UUID `json:"id"`
	CountID uuid.UUID `json:"countId"`
	AssetID uuid.UUID `json:"assetId"`
	Found   bool      `json:"found"`
	Note    *string   `json:"note"`
}
