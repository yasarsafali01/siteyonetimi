package parking

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("kayıt bulunamadı")
var ErrSpotOccupied = errors.New("park alanı bu aralıkta zaten rezerve edilmiş")

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// --- Spots ---

func (s *Service) CreateSpot(ctx context.Context, tenantID, siteID uuid.UUID, spotNumber, spotType string, unitID *uuid.UUID) (Spot, error) {
	var sp Spot
	err := s.pool.QueryRow(ctx,
		`INSERT INTO parking_spots (tenant_id, site_id, spot_number, spot_type, unit_id) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, site_id, spot_number, spot_type, unit_id, is_active, created_at`,
		tenantID, siteID, spotNumber, spotType, unitID,
	).Scan(&sp.ID, &sp.TenantID, &sp.SiteID, &sp.SpotNumber, &sp.SpotType, &sp.UnitID, &sp.IsActive, &sp.CreatedAt)
	return sp, err
}

func (s *Service) ListSpots(ctx context.Context, tenantID, siteID uuid.UUID) ([]Spot, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, spot_number, spot_type, unit_id, is_active, created_at
		 FROM parking_spots WHERE tenant_id = $1 AND site_id = $2 ORDER BY spot_number`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Spot{}
	for rows.Next() {
		var sp Spot
		if err := rows.Scan(&sp.ID, &sp.TenantID, &sp.SiteID, &sp.SpotNumber, &sp.SpotType, &sp.UnitID, &sp.IsActive, &sp.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, sp)
	}
	return list, rows.Err()
}

// --- Vehicle Records (Araç Kayıtları + Misafir Araçları + Plaka Sorgulama) ---

func (s *Service) CheckInVehicle(ctx context.Context, tenantID, siteID uuid.UUID, spotID *uuid.UUID, plate, ownerType string, unitID *uuid.UUID) (VehicleRecord, error) {
	var v VehicleRecord
	err := s.pool.QueryRow(ctx,
		`INSERT INTO parking_vehicle_records (tenant_id, site_id, spot_id, plate, owner_type, unit_id)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, site_id, spot_id, plate, owner_type, unit_id, entered_at, exited_at, created_at`,
		tenantID, siteID, spotID, plate, ownerType, unitID,
	).Scan(&v.ID, &v.TenantID, &v.SiteID, &v.SpotID, &v.Plate, &v.OwnerType, &v.UnitID, &v.EnteredAt, &v.ExitedAt, &v.CreatedAt)
	return v, err
}

func (s *Service) ExitVehicle(ctx context.Context, tenantID, recordID uuid.UUID) (VehicleRecord, error) {
	var v VehicleRecord
	err := s.pool.QueryRow(ctx,
		`UPDATE parking_vehicle_records SET exited_at = now() WHERE id = $1 AND tenant_id = $2 AND exited_at IS NULL
		 RETURNING id, tenant_id, site_id, spot_id, plate, owner_type, unit_id, entered_at, exited_at, created_at`,
		recordID, tenantID,
	).Scan(&v.ID, &v.TenantID, &v.SiteID, &v.SpotID, &v.Plate, &v.OwnerType, &v.UnitID, &v.EnteredAt, &v.ExitedAt, &v.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return VehicleRecord{}, ErrNotFound
	}
	return v, err
}

// ListVehicleRecords siteye göre listeler; plate verilirse plaka sorgulama (kısmi eşleşme) yapar.
func (s *Service) ListVehicleRecords(ctx context.Context, tenantID, siteID uuid.UUID, plate string) ([]VehicleRecord, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, spot_id, plate, owner_type, unit_id, entered_at, exited_at, created_at
		 FROM parking_vehicle_records
		 WHERE tenant_id = $1 AND site_id = $2 AND ($3 = '' OR plate ILIKE '%' || $3 || '%')
		 ORDER BY entered_at DESC`, tenantID, siteID, plate,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []VehicleRecord{}
	for rows.Next() {
		var v VehicleRecord
		if err := rows.Scan(&v.ID, &v.TenantID, &v.SiteID, &v.SpotID, &v.Plate, &v.OwnerType, &v.UnitID, &v.EnteredAt, &v.ExitedAt, &v.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, v)
	}
	return list, rows.Err()
}

// --- Reservations ---

func (s *Service) CreateReservation(ctx context.Context, tenantID, siteID, spotID uuid.UUID, unitID, reservedBy *uuid.UUID, startTime, endTime string) (Reservation, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Reservation{}, err
	}
	defer tx.Rollback(ctx)

	var overlapCount int
	err = tx.QueryRow(ctx,
		`SELECT count(*) FROM parking_reservations
		 WHERE spot_id = $1 AND status = 'aktif' AND start_time < $3 AND end_time > $2`,
		spotID, startTime, endTime,
	).Scan(&overlapCount)
	if err != nil {
		return Reservation{}, err
	}
	if overlapCount > 0 {
		return Reservation{}, ErrSpotOccupied
	}

	var r Reservation
	err = tx.QueryRow(ctx,
		`INSERT INTO parking_reservations (tenant_id, site_id, spot_id, unit_id, reserved_by, start_time, end_time)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, tenant_id, site_id, spot_id, unit_id, reserved_by, start_time, end_time, status, created_at`,
		tenantID, siteID, spotID, unitID, reservedBy, startTime, endTime,
	).Scan(&r.ID, &r.TenantID, &r.SiteID, &r.SpotID, &r.UnitID, &r.ReservedBy, &r.StartTime, &r.EndTime, &r.Status, &r.CreatedAt)
	if err != nil {
		return Reservation{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Reservation{}, err
	}
	return r, nil
}

func (s *Service) CancelReservation(ctx context.Context, tenantID, reservationID uuid.UUID) (Reservation, error) {
	var r Reservation
	err := s.pool.QueryRow(ctx,
		`UPDATE parking_reservations SET status = 'iptal' WHERE id = $1 AND tenant_id = $2
		 RETURNING id, tenant_id, site_id, spot_id, unit_id, reserved_by, start_time, end_time, status, created_at`,
		reservationID, tenantID,
	).Scan(&r.ID, &r.TenantID, &r.SiteID, &r.SpotID, &r.UnitID, &r.ReservedBy, &r.StartTime, &r.EndTime, &r.Status, &r.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Reservation{}, ErrNotFound
	}
	return r, err
}

func (s *Service) ListReservations(ctx context.Context, tenantID, siteID uuid.UUID) ([]Reservation, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, spot_id, unit_id, reserved_by, start_time, end_time, status, created_at
		 FROM parking_reservations WHERE tenant_id = $1 AND site_id = $2 ORDER BY start_time DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Reservation{}
	for rows.Next() {
		var r Reservation
		if err := rows.Scan(&r.ID, &r.TenantID, &r.SiteID, &r.SpotID, &r.UnitID, &r.ReservedBy, &r.StartTime, &r.EndTime, &r.Status, &r.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}
