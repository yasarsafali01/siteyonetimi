package crm

import (
	"time"

	"github.com/google/uuid"
)

type Person struct {
	ID         uuid.UUID `json:"id"`
	TenantID   uuid.UUID `json:"tenantId"`
	FirstName  string    `json:"firstName"`
	LastName   string    `json:"lastName"`
	NationalID *string   `json:"nationalId"`
	Phone      *string   `json:"phone"`
	Email      *string   `json:"email"`
	IsActive   bool      `json:"isActive"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type UnitResident struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenantId"`
	UnitID    uuid.UUID  `json:"unitId"`
	PersonID  uuid.UUID  `json:"personId"`
	Relation  string     `json:"relation"` // malik | kiraci
	StartDate *time.Time `json:"startDate"`
	EndDate   *time.Time `json:"endDate"`
	IsActive  bool       `json:"isActive"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

type FamilyMember struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	PersonID  uuid.UUID `json:"personId"`
	FullName  string    `json:"fullName"`
	Relation  *string   `json:"relation"`
	Phone     *string   `json:"phone"`
	CreatedAt time.Time `json:"createdAt"`
}

type EmergencyContact struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	PersonID  uuid.UUID `json:"personId"`
	FullName  string    `json:"fullName"`
	Phone     string    `json:"phone"`
	Relation  *string   `json:"relation"`
	CreatedAt time.Time `json:"createdAt"`
}

type Vehicle struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	PersonID  uuid.UUID `json:"personId"`
	Plate     string    `json:"plate"`
	Brand     *string   `json:"brand"`
	Model     *string   `json:"model"`
	Color     *string   `json:"color"`
	CreatedAt time.Time `json:"createdAt"`
}

type Pet struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	PersonID  uuid.UUID `json:"personId"`
	Name      string    `json:"name"`
	Species   *string   `json:"species"`
	Breed     *string   `json:"breed"`
	CreatedAt time.Time `json:"createdAt"`
}

type PowerOfAttorney struct {
	ID           uuid.UUID  `json:"id"`
	TenantID     uuid.UUID  `json:"tenantId"`
	PersonID     uuid.UUID  `json:"personId"`
	AttorneyName string     `json:"attorneyName"`
	DocumentNo   *string    `json:"documentNo"`
	IssuedBy     *string    `json:"issuedBy"`
	ValidUntil   *time.Time `json:"validUntil"`
	CreatedAt    time.Time  `json:"createdAt"`
}

type ContactHistoryEntry struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenantId"`
	PersonID  uuid.UUID  `json:"personId"`
	Channel   string     `json:"channel"`
	Summary   string     `json:"summary"`
	CreatedBy *uuid.UUID `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
}

type PersonNote struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenantId"`
	PersonID  uuid.UUID  `json:"personId"`
	Note      string     `json:"note"`
	CreatedBy *uuid.UUID `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
}
