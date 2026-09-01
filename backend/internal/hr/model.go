package hr

import (
	"time"

	"github.com/google/uuid"
)

type Employee struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenantId"`
	SiteID     uuid.UUID  `json:"siteId"`
	FirstName  string     `json:"firstName"`
	LastName   string     `json:"lastName"`
	Position   *string    `json:"position"`
	Phone      *string    `json:"phone"`
	NationalID *string    `json:"nationalId"`
	HireDate   *time.Time `json:"hireDate"`
	IsActive   bool       `json:"isActive"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type Shift struct {
	ID         uuid.UUID `json:"id"`
	TenantID   uuid.UUID `json:"tenantId"`
	EmployeeID uuid.UUID `json:"employeeId"`
	ShiftDate  time.Time `json:"shiftDate"`
	StartTime  string    `json:"startTime"`
	EndTime    string    `json:"endTime"`
	CreatedAt  time.Time `json:"createdAt"`
}

type Timesheet struct {
	ID         uuid.UUID `json:"id"`
	TenantID   uuid.UUID `json:"tenantId"`
	EmployeeID uuid.UUID `json:"employeeId"`
	WorkDate   time.Time `json:"workDate"`
	CheckIn    *string   `json:"checkIn"`
	CheckOut   *string   `json:"checkOut"`
	Note       *string   `json:"note"`
	CreatedAt  time.Time `json:"createdAt"`
}

type LeaveRequest struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenantId"`
	EmployeeID uuid.UUID  `json:"employeeId"`
	Type       string     `json:"type"`
	StartDate  time.Time  `json:"startDate"`
	EndDate    time.Time  `json:"endDate"`
	Status     string     `json:"status"`
	Reason     *string    `json:"reason"`
	ApprovedBy *uuid.UUID `json:"approvedBy"`
	CreatedAt  time.Time  `json:"createdAt"`
}

type SalaryAdvance struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	EmployeeID  uuid.UUID  `json:"employeeId"`
	Amount      float64    `json:"amount"`
	RequestedAt time.Time  `json:"requestedAt"`
	Note        *string    `json:"note"`
	CreatedBy   *uuid.UUID `json:"createdBy"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type PerformanceReview struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenantId"`
	EmployeeID uuid.UUID  `json:"employeeId"`
	ReviewDate time.Time  `json:"reviewDate"`
	Score      int        `json:"score"`
	Comment    *string    `json:"comment"`
	ReviewedBy *uuid.UUID `json:"reviewedBy"`
	CreatedAt  time.Time  `json:"createdAt"`
}
