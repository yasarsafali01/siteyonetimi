package maintenance

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

// --- Facilities (Tesis Varlıkları) ---

func (s *Service) CreateFacility(ctx context.Context, tenantID, siteID uuid.UUID, facType, name string, location *string) (Facility, error) {
	var f Facility
	err := s.pool.QueryRow(ctx,
		`INSERT INTO facilities (tenant_id, site_id, type, name, location) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, site_id, type, name, location, is_active, created_at`,
		tenantID, siteID, facType, name, location,
	).Scan(&f.ID, &f.TenantID, &f.SiteID, &f.Type, &f.Name, &f.Location, &f.IsActive, &f.CreatedAt)
	return f, err
}

func (s *Service) ListFacilities(ctx context.Context, tenantID, siteID uuid.UUID) ([]Facility, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, type, name, location, is_active, created_at
		 FROM facilities WHERE tenant_id = $1 AND site_id = $2 ORDER BY name`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Facility{}
	for rows.Next() {
		var f Facility
		if err := rows.Scan(&f.ID, &f.TenantID, &f.SiteID, &f.Type, &f.Name, &f.Location, &f.IsActive, &f.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, f)
	}
	return list, rows.Err()
}

// --- Maintenance Plans (Periyodik Bakım Planları) ---

func (s *Service) CreatePlan(ctx context.Context, tenantID, facilityID uuid.UUID, title string, frequencyDays int, nextDueDate string) (Plan, error) {
	var p Plan
	err := s.pool.QueryRow(ctx,
		`INSERT INTO maintenance_plans (tenant_id, facility_id, title, frequency_days, next_due_date) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, facility_id, title, frequency_days, next_due_date, is_active, created_at`,
		tenantID, facilityID, title, frequencyDays, nextDueDate,
	).Scan(&p.ID, &p.TenantID, &p.FacilityID, &p.Title, &p.FrequencyDays, &p.NextDueDate, &p.IsActive, &p.CreatedAt)
	return p, err
}

func (s *Service) ListPlans(ctx context.Context, tenantID, facilityID uuid.UUID) ([]Plan, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, facility_id, title, frequency_days, next_due_date, is_active, created_at
		 FROM maintenance_plans WHERE tenant_id = $1 AND facility_id = $2 ORDER BY next_due_date`, tenantID, facilityID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Plan{}
	for rows.Next() {
		var p Plan
		if err := rows.Scan(&p.ID, &p.TenantID, &p.FacilityID, &p.Title, &p.FrequencyDays, &p.NextDueDate, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

// ListDuePlans, vadesi gelmiş (bugün veya geçmiş) aktif bakım planlarını döner.
func (s *Service) ListDuePlans(ctx context.Context, tenantID, siteID uuid.UUID) ([]Plan, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT mp.id, mp.tenant_id, mp.facility_id, mp.title, mp.frequency_days, mp.next_due_date, mp.is_active, mp.created_at
		 FROM maintenance_plans mp
		 JOIN facilities f ON f.id = mp.facility_id
		 WHERE mp.tenant_id = $1 AND f.site_id = $2 AND mp.is_active = TRUE AND mp.next_due_date <= CURRENT_DATE
		 ORDER BY mp.next_due_date`,
		tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Plan{}
	for rows.Next() {
		var p Plan
		if err := rows.Scan(&p.ID, &p.TenantID, &p.FacilityID, &p.Title, &p.FrequencyDays, &p.NextDueDate, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

// --- Work Orders (İş Emirleri) ---

func (s *Service) CreateWorkOrder(ctx context.Context, tenantID, siteID uuid.UUID, facilityID, planID *uuid.UUID, title string, description *string, scheduledDate *string, createdBy *uuid.UUID) (WorkOrder, error) {
	var w WorkOrder
	err := s.pool.QueryRow(ctx,
		`INSERT INTO work_orders (tenant_id, site_id, facility_id, plan_id, title, description, scheduled_date, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, tenant_id, site_id, facility_id, plan_id, title, description, status, scheduled_date, completed_at, completion_note, assigned_to, created_by, created_at, updated_at`,
		tenantID, siteID, facilityID, planID, title, description, scheduledDate, createdBy,
	).Scan(&w.ID, &w.TenantID, &w.SiteID, &w.FacilityID, &w.PlanID, &w.Title, &w.Description, &w.Status, &w.ScheduledDate, &w.CompletedAt, &w.CompletionNote, &w.AssignedTo, &w.CreatedBy, &w.CreatedAt, &w.UpdatedAt)
	return w, err
}

func (s *Service) ListWorkOrders(ctx context.Context, tenantID, siteID uuid.UUID, status string) ([]WorkOrder, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, facility_id, plan_id, title, description, status, scheduled_date, completed_at, completion_note, assigned_to, created_by, created_at, updated_at
		 FROM work_orders
		 WHERE tenant_id = $1 AND site_id = $2 AND ($3 = '' OR status::text = $3)
		 ORDER BY created_at DESC`,
		tenantID, siteID, status,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []WorkOrder{}
	for rows.Next() {
		var w WorkOrder
		if err := rows.Scan(&w.ID, &w.TenantID, &w.SiteID, &w.FacilityID, &w.PlanID, &w.Title, &w.Description, &w.Status, &w.ScheduledDate, &w.CompletedAt, &w.CompletionNote, &w.AssignedTo, &w.CreatedBy, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, w)
	}
	return list, rows.Err()
}

func (s *Service) AssignWorkOrder(ctx context.Context, tenantID, workOrderID, assigneeID uuid.UUID) (WorkOrder, error) {
	var w WorkOrder
	err := s.pool.QueryRow(ctx,
		`UPDATE work_orders SET assigned_to = $1, status = 'devam_ediyor', updated_at = now()
		 WHERE id = $2 AND tenant_id = $3
		 RETURNING id, tenant_id, site_id, facility_id, plan_id, title, description, status, scheduled_date, completed_at, completion_note, assigned_to, created_by, created_at, updated_at`,
		assigneeID, workOrderID, tenantID,
	).Scan(&w.ID, &w.TenantID, &w.SiteID, &w.FacilityID, &w.PlanID, &w.Title, &w.Description, &w.Status, &w.ScheduledDate, &w.CompletedAt, &w.CompletionNote, &w.AssignedTo, &w.CreatedBy, &w.CreatedAt, &w.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return WorkOrder{}, ErrNotFound
	}
	return w, err
}

// CompleteWorkOrder (Bakım geçmişi): iş emrini tamamlanmış olarak işaretler; eğer bir plandan
// geldiyse, planın bir sonraki vade tarihini frequency_days kadar ileri alır.
func (s *Service) CompleteWorkOrder(ctx context.Context, tenantID, workOrderID uuid.UUID, note *string) (WorkOrder, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return WorkOrder{}, err
	}
	defer tx.Rollback(ctx)

	var w WorkOrder
	err = tx.QueryRow(ctx,
		`UPDATE work_orders SET status = 'tamamlandi', completed_at = now(), completion_note = $1, updated_at = now()
		 WHERE id = $2 AND tenant_id = $3
		 RETURNING id, tenant_id, site_id, facility_id, plan_id, title, description, status, scheduled_date, completed_at, completion_note, assigned_to, created_by, created_at, updated_at`,
		note, workOrderID, tenantID,
	).Scan(&w.ID, &w.TenantID, &w.SiteID, &w.FacilityID, &w.PlanID, &w.Title, &w.Description, &w.Status, &w.ScheduledDate, &w.CompletedAt, &w.CompletionNote, &w.AssignedTo, &w.CreatedBy, &w.CreatedAt, &w.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return WorkOrder{}, ErrNotFound
	}
	if err != nil {
		return WorkOrder{}, err
	}

	if w.PlanID != nil {
		if _, err := tx.Exec(ctx,
			`UPDATE maintenance_plans SET next_due_date = CURRENT_DATE + frequency_days WHERE id = $1 AND tenant_id = $2`,
			*w.PlanID, tenantID,
		); err != nil {
			return WorkOrder{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return WorkOrder{}, err
	}
	return w, nil
}
