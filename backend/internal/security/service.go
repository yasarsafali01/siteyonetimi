package security

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

// --- Checkpoints ---

func (s *Service) CreateCheckpoint(ctx context.Context, tenantID, siteID uuid.UUID, name string, location *string) (Checkpoint, error) {
	var cp Checkpoint
	err := s.pool.QueryRow(ctx,
		`INSERT INTO patrol_checkpoints (tenant_id, site_id, name, location) VALUES ($1, $2, $3, $4)
		 RETURNING id, tenant_id, site_id, name, location, is_active, created_at`,
		tenantID, siteID, name, location,
	).Scan(&cp.ID, &cp.TenantID, &cp.SiteID, &cp.Name, &cp.Location, &cp.IsActive, &cp.CreatedAt)
	return cp, err
}

func (s *Service) ListCheckpoints(ctx context.Context, tenantID, siteID uuid.UUID) ([]Checkpoint, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, name, location, is_active, created_at
		 FROM patrol_checkpoints WHERE tenant_id = $1 AND site_id = $2 ORDER BY name`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Checkpoint{}
	for rows.Next() {
		var cp Checkpoint
		if err := rows.Scan(&cp.ID, &cp.TenantID, &cp.SiteID, &cp.Name, &cp.Location, &cp.IsActive, &cp.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, cp)
	}
	return list, rows.Err()
}

// --- Patrols (Devriye + Tur Kontrol) ---

func (s *Service) StartPatrol(ctx context.Context, tenantID, siteID uuid.UUID, guardID *uuid.UUID) (Patrol, error) {
	var p Patrol
	err := s.pool.QueryRow(ctx,
		`INSERT INTO patrols (tenant_id, site_id, guard_id) VALUES ($1, $2, $3)
		 RETURNING id, tenant_id, site_id, guard_id, started_at, completed_at, note`,
		tenantID, siteID, guardID,
	).Scan(&p.ID, &p.TenantID, &p.SiteID, &p.GuardID, &p.StartedAt, &p.CompletedAt, &p.Note)
	return p, err
}

func (s *Service) ListPatrols(ctx context.Context, tenantID, siteID uuid.UUID) ([]Patrol, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, guard_id, started_at, completed_at, note
		 FROM patrols WHERE tenant_id = $1 AND site_id = $2 ORDER BY started_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Patrol{}
	for rows.Next() {
		var p Patrol
		if err := rows.Scan(&p.ID, &p.TenantID, &p.SiteID, &p.GuardID, &p.StartedAt, &p.CompletedAt, &p.Note); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

func (s *Service) ScanCheckpoint(ctx context.Context, tenantID, patrolID, checkpointID uuid.UUID) (PatrolScan, error) {
	var sc PatrolScan
	err := s.pool.QueryRow(ctx,
		`INSERT INTO patrol_scans (tenant_id, patrol_id, checkpoint_id) VALUES ($1, $2, $3)
		 RETURNING id, patrol_id, checkpoint_id, scanned_at`,
		tenantID, patrolID, checkpointID,
	).Scan(&sc.ID, &sc.PatrolID, &sc.CheckpointID, &sc.ScannedAt)
	return sc, err
}

func (s *Service) ListScans(ctx context.Context, tenantID, patrolID uuid.UUID) ([]PatrolScan, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, patrol_id, checkpoint_id, scanned_at FROM patrol_scans
		 WHERE tenant_id = $1 AND patrol_id = $2 ORDER BY scanned_at`, tenantID, patrolID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []PatrolScan{}
	for rows.Next() {
		var sc PatrolScan
		if err := rows.Scan(&sc.ID, &sc.PatrolID, &sc.CheckpointID, &sc.ScannedAt); err != nil {
			return nil, err
		}
		list = append(list, sc)
	}
	return list, rows.Err()
}

func (s *Service) CompletePatrol(ctx context.Context, tenantID, patrolID uuid.UUID, note *string) (Patrol, error) {
	var p Patrol
	err := s.pool.QueryRow(ctx,
		`UPDATE patrols SET completed_at = now(), note = $1 WHERE id = $2 AND tenant_id = $3
		 RETURNING id, tenant_id, site_id, guard_id, started_at, completed_at, note`,
		note, patrolID, tenantID,
	).Scan(&p.ID, &p.TenantID, &p.SiteID, &p.GuardID, &p.StartedAt, &p.CompletedAt, &p.Note)
	if errors.Is(err, pgx.ErrNoRows) {
		return Patrol{}, ErrNotFound
	}
	return p, err
}

// --- Incidents (Olay Kayıtları + Kamera Notları) ---

func (s *Service) CreateIncident(ctx context.Context, tenantID, siteID uuid.UUID, title string, description *string, severity string, cameraNote *string, reportedBy *uuid.UUID) (Incident, error) {
	var inc Incident
	err := s.pool.QueryRow(ctx,
		`INSERT INTO security_incidents (tenant_id, site_id, title, description, severity, camera_note, reported_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, tenant_id, site_id, title, description, severity, camera_note, occurred_at, reported_by, created_at`,
		tenantID, siteID, title, description, severity, cameraNote, reportedBy,
	).Scan(&inc.ID, &inc.TenantID, &inc.SiteID, &inc.Title, &inc.Description, &inc.Severity, &inc.CameraNote, &inc.OccurredAt, &inc.ReportedBy, &inc.CreatedAt)
	return inc, err
}

func (s *Service) ListIncidents(ctx context.Context, tenantID, siteID uuid.UUID) ([]Incident, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, title, description, severity, camera_note, occurred_at, reported_by, created_at
		 FROM security_incidents WHERE tenant_id = $1 AND site_id = $2 ORDER BY occurred_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Incident{}
	for rows.Next() {
		var inc Incident
		if err := rows.Scan(&inc.ID, &inc.TenantID, &inc.SiteID, &inc.Title, &inc.Description, &inc.Severity, &inc.CameraNote, &inc.OccurredAt, &inc.ReportedBy, &inc.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, inc)
	}
	return list, rows.Err()
}

// --- Shifts (Vardiya Takibi) ---

func (s *Service) CreateShift(ctx context.Context, tenantID, siteID uuid.UUID, guardID *uuid.UUID, shiftDate, startTime, endTime string) (Shift, error) {
	var sh Shift
	err := s.pool.QueryRow(ctx,
		`INSERT INTO security_shifts (tenant_id, site_id, guard_id, shift_date, start_time, end_time) VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, site_id, guard_id, shift_date, start_time, end_time, created_at`,
		tenantID, siteID, guardID, shiftDate, startTime, endTime,
	).Scan(&sh.ID, &sh.TenantID, &sh.SiteID, &sh.GuardID, &sh.ShiftDate, &sh.StartTime, &sh.EndTime, &sh.CreatedAt)
	return sh, err
}

func (s *Service) ListShifts(ctx context.Context, tenantID, siteID uuid.UUID) ([]Shift, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, guard_id, shift_date, start_time, end_time, created_at
		 FROM security_shifts WHERE tenant_id = $1 AND site_id = $2 ORDER BY shift_date DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Shift{}
	for rows.Next() {
		var sh Shift
		if err := rows.Scan(&sh.ID, &sh.TenantID, &sh.SiteID, &sh.GuardID, &sh.ShiftDate, &sh.StartTime, &sh.EndTime, &sh.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, sh)
	}
	return list, rows.Err()
}
