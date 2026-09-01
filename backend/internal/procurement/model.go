package procurement

import (
	"time"

	"github.com/google/uuid"
)

type Supplier struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenantId"`
	SiteID      uuid.UUID `json:"siteId"`
	Name        string    `json:"name"`
	ContactName *string   `json:"contactName"`
	Phone       *string   `json:"phone"`
	Email       *string   `json:"email"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
}

type PurchaseRequest struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	SiteID      uuid.UUID  `json:"siteId"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Status      string     `json:"status"`
	RequestedBy *uuid.UUID `json:"requestedBy"`
	ApprovedBy  *uuid.UUID `json:"approvedBy"`
	ApprovedAt  *time.Time `json:"approvedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

type Quote struct {
	ID         uuid.UUID `json:"id"`
	TenantID   uuid.UUID `json:"tenantId"`
	RequestID  uuid.UUID `json:"requestId"`
	SupplierID uuid.UUID `json:"supplierId"`
	Amount     float64   `json:"amount"`
	Note       *string   `json:"note"`
	IsSelected bool      `json:"isSelected"`
	CreatedAt  time.Time `json:"createdAt"`
}

type PurchaseOrder struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	SiteID      uuid.UUID  `json:"siteId"`
	RequestID   *uuid.UUID `json:"requestId"`
	SupplierID  uuid.UUID  `json:"supplierId"`
	Amount      float64    `json:"amount"`
	Status      string     `json:"status"`
	OrderedAt   time.Time  `json:"orderedAt"`
	DeliveredAt *time.Time `json:"deliveredAt"`
	CreatedBy   *uuid.UUID `json:"createdBy"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type SupplierInvoice struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenantId"`
	OrderID     uuid.UUID `json:"orderId"`
	InvoiceNo   *string   `json:"invoiceNo"`
	Amount      float64   `json:"amount"`
	InvoiceDate time.Time `json:"invoiceDate"`
	IsPaid      bool      `json:"isPaid"`
	CreatedAt   time.Time `json:"createdAt"`
}
