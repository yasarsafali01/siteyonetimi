package finance

import (
	"time"

	"github.com/google/uuid"
)

type Charge struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	SiteID      uuid.UUID  `json:"siteId"`
	UnitID      uuid.UUID  `json:"unitId"`
	Type        string     `json:"type"`
	Period      *string    `json:"period"`
	Description *string    `json:"description"`
	Amount      float64    `json:"amount"`
	DueDate     *time.Time `json:"dueDate"`
	CreatedBy   *uuid.UUID `json:"createdBy"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// ChargeWithBalance, bir borcu ona yapılan ödemelerin toplamıyla birlikte döner.
type ChargeWithBalance struct {
	Charge
	PaidAmount      float64 `json:"paidAmount"`
	RemainingAmount float64 `json:"remainingAmount"`
}

type Payment struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenantId"`
	ChargeID  uuid.UUID  `json:"chargeId"`
	Amount    float64    `json:"amount"`
	Method    string     `json:"method"`
	PaidAt    time.Time  `json:"paidAt"`
	Note      *string    `json:"note"`
	CreatedBy *uuid.UUID `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
}

// UnitBalance, bir bağımsız bölümün toplam borç/ödeme/kalan bakiyesini özetler.
type UnitBalance struct {
	UnitID          uuid.UUID `json:"unitId"`
	TotalCharged    float64   `json:"totalCharged"`
	TotalPaid       float64   `json:"totalPaid"`
	RemainingAmount float64   `json:"remainingAmount"`
}
