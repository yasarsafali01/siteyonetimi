package hr

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("kayıt bulunamadı")

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// --- Employees ---

type EmployeeInput struct {
	FirstName  string
	LastName   string
	Position   *string
	Phone      *string
	NationalID *string
	HireDate   *string
}

func (s *Service) CreateEmployee(ctx context.Context, tenantID, siteID uuid.UUID, in EmployeeInput) (Employee, error) {
	var e Employee
	err := s.pool.QueryRow(ctx,
		`INSERT INTO employees (tenant_id, site_id, first_name, last_name, position, phone, national_id, hire_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, tenant_id, site_id, first_name, last_name, position, phone, national_id, hire_date, is_active, created_at`,
		tenantID, siteID, in.FirstName, in.LastName, in.Position, in.Phone, in.NationalID, in.HireDate,
	).Scan(&e.ID, &e.TenantID, &e.SiteID, &e.FirstName, &e.LastName, &e.Position, &e.Phone, &e.NationalID, &e.HireDate, &e.IsActive, &e.CreatedAt)
	return e, err
}

func (s *Service) ListEmployees(ctx context.Context, tenantID, siteID uuid.UUID) ([]Employee, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, first_name, last_name, position, phone, national_id, hire_date, is_active, created_at
		 FROM employees WHERE tenant_id = $1 AND site_id = $2 ORDER BY first_name, last_name`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Employee{}
	for rows.Next() {
		var e Employee
		if err := rows.Scan(&e.ID, &e.TenantID, &e.SiteID, &e.FirstName, &e.LastName, &e.Position, &e.Phone, &e.NationalID, &e.HireDate, &e.IsActive, &e.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

func (s *Service) DeactivateEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx, `UPDATE employees SET is_active = FALSE, updated_at = now() WHERE id = $1 AND tenant_id = $2`, employeeID, tenantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Shifts ---

func (s *Service) CreateShift(ctx context.Context, tenantID, employeeID uuid.UUID, shiftDate, startTime, endTime string) (Shift, error) {
	var sh Shift
	err := s.pool.QueryRow(ctx,
		`INSERT INTO shifts (tenant_id, employee_id, shift_date, start_time, end_time) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, employee_id, shift_date, start_time, end_time, created_at`,
		tenantID, employeeID, shiftDate, startTime, endTime,
	).Scan(&sh.ID, &sh.TenantID, &sh.EmployeeID, &sh.ShiftDate, &sh.StartTime, &sh.EndTime, &sh.CreatedAt)
	return sh, err
}

func (s *Service) ListShifts(ctx context.Context, tenantID, employeeID uuid.UUID) ([]Shift, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, employee_id, shift_date, start_time, end_time, created_at
		 FROM shifts WHERE tenant_id = $1 AND employee_id = $2 ORDER BY shift_date DESC`, tenantID, employeeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Shift{}
	for rows.Next() {
		var sh Shift
		if err := rows.Scan(&sh.ID, &sh.TenantID, &sh.EmployeeID, &sh.ShiftDate, &sh.StartTime, &sh.EndTime, &sh.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, sh)
	}
	return list, rows.Err()
}

// --- Timesheets (Puantaj) ---

func (s *Service) CreateTimesheet(ctx context.Context, tenantID, employeeID uuid.UUID, workDate string, checkIn, checkOut, note *string) (Timesheet, error) {
	var t Timesheet
	err := s.pool.QueryRow(ctx,
		`INSERT INTO timesheets (tenant_id, employee_id, work_date, check_in, check_out, note) VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, employee_id, work_date, check_in, check_out, note, created_at`,
		tenantID, employeeID, workDate, checkIn, checkOut, note,
	).Scan(&t.ID, &t.TenantID, &t.EmployeeID, &t.WorkDate, &t.CheckIn, &t.CheckOut, &t.Note, &t.CreatedAt)
	return t, err
}

func (s *Service) ListTimesheets(ctx context.Context, tenantID, employeeID uuid.UUID) ([]Timesheet, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, employee_id, work_date, check_in, check_out, note, created_at
		 FROM timesheets WHERE tenant_id = $1 AND employee_id = $2 ORDER BY work_date DESC`, tenantID, employeeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Timesheet{}
	for rows.Next() {
		var t Timesheet
		if err := rows.Scan(&t.ID, &t.TenantID, &t.EmployeeID, &t.WorkDate, &t.CheckIn, &t.CheckOut, &t.Note, &t.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

// --- Leave Requests (İzin Yönetimi) ---

func (s *Service) CreateLeaveRequest(ctx context.Context, tenantID, employeeID uuid.UUID, leaveType, startDate, endDate string, reason *string) (LeaveRequest, error) {
	var l LeaveRequest
	err := s.pool.QueryRow(ctx,
		`INSERT INTO leave_requests (tenant_id, employee_id, type, start_date, end_date, reason) VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, employee_id, type, start_date, end_date, status, reason, approved_by, created_at`,
		tenantID, employeeID, leaveType, startDate, endDate, reason,
	).Scan(&l.ID, &l.TenantID, &l.EmployeeID, &l.Type, &l.StartDate, &l.EndDate, &l.Status, &l.Reason, &l.ApprovedBy, &l.CreatedAt)
	return l, err
}

func (s *Service) ListLeaveRequests(ctx context.Context, tenantID, employeeID uuid.UUID) ([]LeaveRequest, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, employee_id, type, start_date, end_date, status, reason, approved_by, created_at
		 FROM leave_requests WHERE tenant_id = $1 AND employee_id = $2 ORDER BY start_date DESC`, tenantID, employeeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []LeaveRequest{}
	for rows.Next() {
		var l LeaveRequest
		if err := rows.Scan(&l.ID, &l.TenantID, &l.EmployeeID, &l.Type, &l.StartDate, &l.EndDate, &l.Status, &l.Reason, &l.ApprovedBy, &l.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, l)
	}
	return list, rows.Err()
}

func (s *Service) DecideLeaveRequest(ctx context.Context, tenantID, leaveID uuid.UUID, approve bool, approvedBy *uuid.UUID) (LeaveRequest, error) {
	status := "reddedildi"
	if approve {
		status = "onaylandi"
	}
	var l LeaveRequest
	err := s.pool.QueryRow(ctx,
		`UPDATE leave_requests SET status = $1, approved_by = $2 WHERE id = $3 AND tenant_id = $4
		 RETURNING id, tenant_id, employee_id, type, start_date, end_date, status, reason, approved_by, created_at`,
		status, approvedBy, leaveID, tenantID,
	).Scan(&l.ID, &l.TenantID, &l.EmployeeID, &l.Type, &l.StartDate, &l.EndDate, &l.Status, &l.Reason, &l.ApprovedBy, &l.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return LeaveRequest{}, ErrNotFound
	}
	return l, err
}

// --- Salary Advances (Avans İşlemleri) ---

func (s *Service) CreateSalaryAdvance(ctx context.Context, tenantID, employeeID uuid.UUID, amount float64, note *string, createdBy *uuid.UUID) (SalaryAdvance, error) {
	var a SalaryAdvance
	err := s.pool.QueryRow(ctx,
		`INSERT INTO salary_advances (tenant_id, employee_id, amount, note, created_by) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, employee_id, amount, requested_at, note, created_by, created_at`,
		tenantID, employeeID, amount, note, createdBy,
	).Scan(&a.ID, &a.TenantID, &a.EmployeeID, &a.Amount, &a.RequestedAt, &a.Note, &a.CreatedBy, &a.CreatedAt)
	return a, err
}

func (s *Service) ListSalaryAdvances(ctx context.Context, tenantID, employeeID uuid.UUID) ([]SalaryAdvance, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, employee_id, amount, requested_at, note, created_by, created_at
		 FROM salary_advances WHERE tenant_id = $1 AND employee_id = $2 ORDER BY requested_at DESC`, tenantID, employeeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []SalaryAdvance{}
	for rows.Next() {
		var a SalaryAdvance
		if err := rows.Scan(&a.ID, &a.TenantID, &a.EmployeeID, &a.Amount, &a.RequestedAt, &a.Note, &a.CreatedBy, &a.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}

// --- Performance Reviews ---

func (s *Service) CreatePerformanceReview(ctx context.Context, tenantID, employeeID uuid.UUID, score int, comment *string, reviewedBy *uuid.UUID) (PerformanceReview, error) {
	var r PerformanceReview
	err := s.pool.QueryRow(ctx,
		`INSERT INTO performance_reviews (tenant_id, employee_id, score, comment, reviewed_by) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, employee_id, review_date, score, comment, reviewed_by, created_at`,
		tenantID, employeeID, score, comment, reviewedBy,
	).Scan(&r.ID, &r.TenantID, &r.EmployeeID, &r.ReviewDate, &r.Score, &r.Comment, &r.ReviewedBy, &r.CreatedAt)
	return r, err
}

func (s *Service) ListPerformanceReviews(ctx context.Context, tenantID, employeeID uuid.UUID) ([]PerformanceReview, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, employee_id, review_date, score, comment, reviewed_by, created_at
		 FROM performance_reviews WHERE tenant_id = $1 AND employee_id = $2 ORDER BY review_date DESC`, tenantID, employeeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []PerformanceReview{}
	for rows.Next() {
		var r PerformanceReview
		if err := rows.Scan(&r.ID, &r.TenantID, &r.EmployeeID, &r.ReviewDate, &r.Score, &r.Comment, &r.ReviewedBy, &r.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}
