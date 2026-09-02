package legal

import (
	"time"

	"github.com/google/uuid"
)

type Lawyer struct {
	ID             uuid.UUID `json:"id"`
	TenantID       uuid.UUID `json:"tenantId"`
	FullName       string    `json:"fullName"`
	Phone          *string   `json:"phone"`
	Email          *string   `json:"email"`
	BarAssociation *string   `json:"barAssociation"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
}

type Case struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	SiteID      uuid.UUID  `json:"siteId"`
	UnitID      *uuid.UUID `json:"unitId"`
	PersonID    *uuid.UUID `json:"personId"`
	LawyerID    *uuid.UUID `json:"lawyerId"`
	CaseType    string     `json:"caseType"`
	CaseNo      *string    `json:"caseNo"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Status      string     `json:"status"`
	Amount      *float64   `json:"amount"`
	OpenedAt    time.Time  `json:"openedAt"`
	ClosedAt    *time.Time `json:"closedAt"`
	CreatedBy   *uuid.UUID `json:"createdBy"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type Document struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenantId"`
	LegalCaseID uuid.UUID `json:"legalCaseId"`
	Title       string    `json:"title"`
	FileURL     string    `json:"fileUrl"`
	UploadedBy  *uuid.UUID `json:"uploadedBy"`
	CreatedAt   time.Time `json:"createdAt"`
}
