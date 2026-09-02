package reservation

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("kayıt bulunamadı")
var ErrOverlap = errors.New("bu alan seçilen aralıkta zaten rezerve edilmiş")

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

const selectColumns = `id, tenant_id, site_id, common_area_id, unit_id, person_id, reserved_by, start_time, end_time, status, note, decided_by, decided_at, created_at`

func scanReservation(row pgx.Row) (FacilityReservation, error) {
	var r FacilityReservation
	err := row.Scan(&r.ID, &r.TenantID, &r.SiteID, &r.CommonAreaID, &r.UnitID, &r.PersonID, &r.ReservedBy, &r.StartTime, &r.EndTime, &r.Status, &r.Note, &r.DecidedBy, &r.DecidedAt, &r.CreatedAt)
	return r, err
}

func (s *Service) CreateReservation(ctx context.Context, tenantID, siteID, commonAreaID uuid.UUID, unitID, personID, reservedBy *uuid.UUID, startTime, endTime string, note *string) (FacilityReservation, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return FacilityReservation{}, err
	}
	defer tx.Rollback(ctx)

	var overlapCount int
	err = tx.QueryRow(ctx,
		`SELECT count(*) FROM facility_reservations
		 WHERE common_area_id = $1 AND status IN ('bekliyor', 'onaylandi') AND start_time < $3 AND end_time > $2`,
		commonAreaID, startTime, endTime,
	).Scan(&overlapCount)
	if err != nil {
		return FacilityReservation{}, err
	}
	if overlapCount > 0 {
		return FacilityReservation{}, ErrOverlap
	}

	r, err := scanReservation(tx.QueryRow(ctx,
		`INSERT INTO facility_reservations (tenant_id, site_id, common_area_id, unit_id, person_id, reserved_by, start_time, end_time, note)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING `+selectColumns,
		tenantID, siteID, commonAreaID, unitID, personID, reservedBy, startTime, endTime, note,
	))
	if err != nil {
		return FacilityReservation{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return FacilityReservation{}, err
	}
	return r, nil
}

func (s *Service) ListReservations(ctx context.Context, tenantID, siteID uuid.UUID) ([]FacilityReservation, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+selectColumns+` FROM facility_reservations WHERE tenant_id = $1 AND site_id = $2 ORDER BY start_time DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []FacilityReservation{}
	for rows.Next() {
		r, err := scanReservation(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

func (s *Service) DecideReservation(ctx context.Context, tenantID, reservationID uuid.UUID, approve bool, decidedBy *uuid.UUID) (FacilityReservation, error) {
	status := "reddedildi"
	if approve {
		status = "onaylandi"
	}
	r, err := scanReservation(s.pool.QueryRow(ctx,
		`UPDATE facility_reservations SET status = $1, decided_by = $2, decided_at = now()
		 WHERE id = $3 AND tenant_id = $4 AND status = 'bekliyor'
		 RETURNING `+selectColumns,
		status, decidedBy, reservationID, tenantID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return FacilityReservation{}, ErrNotFound
	}
	return r, err
}

func (s *Service) CancelReservation(ctx context.Context, tenantID, reservationID uuid.UUID) (FacilityReservation, error) {
	r, err := scanReservation(s.pool.QueryRow(ctx,
		`UPDATE facility_reservations SET status = 'iptal' WHERE id = $1 AND tenant_id = $2
		 RETURNING `+selectColumns,
		reservationID, tenantID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return FacilityReservation{}, ErrNotFound
	}
	return r, err
}
