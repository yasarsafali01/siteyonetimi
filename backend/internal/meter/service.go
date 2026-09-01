package meter

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("kayıt bulunamadı")
var ErrNotEnoughReadings = errors.New("tüketim hesaplamak için en az iki endeks okuması gerekli")

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// --- Meters ---

func (s *Service) CreateMeter(ctx context.Context, tenantID, siteID uuid.UUID, unitID *uuid.UUID, meterType string, serialNo *string, unitPrice float64) (Meter, error) {
	var m Meter
	err := s.pool.QueryRow(ctx,
		`INSERT INTO meters (tenant_id, site_id, unit_id, type, serial_no, unit_price) VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, site_id, unit_id, type, serial_no, unit_price, is_active, created_at`,
		tenantID, siteID, unitID, meterType, serialNo, unitPrice,
	).Scan(&m.ID, &m.TenantID, &m.SiteID, &m.UnitID, &m.Type, &m.SerialNo, &m.UnitPrice, &m.IsActive, &m.CreatedAt)
	return m, err
}

func (s *Service) ListMeters(ctx context.Context, tenantID, siteID uuid.UUID) ([]Meter, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, unit_id, type, serial_no, unit_price, is_active, created_at
		 FROM meters WHERE tenant_id = $1 AND site_id = $2 ORDER BY created_at`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Meter{}
	for rows.Next() {
		var m Meter
		if err := rows.Scan(&m.ID, &m.TenantID, &m.SiteID, &m.UnitID, &m.Type, &m.SerialNo, &m.UnitPrice, &m.IsActive, &m.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}

func (s *Service) GetMeter(ctx context.Context, tenantID, meterID uuid.UUID) (Meter, error) {
	var m Meter
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, site_id, unit_id, type, serial_no, unit_price, is_active, created_at
		 FROM meters WHERE id = $1 AND tenant_id = $2`, meterID, tenantID,
	).Scan(&m.ID, &m.TenantID, &m.SiteID, &m.UnitID, &m.Type, &m.SerialNo, &m.UnitPrice, &m.IsActive, &m.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Meter{}, ErrNotFound
	}
	return m, err
}

// --- Readings ---

func (s *Service) CreateReading(ctx context.Context, tenantID, meterID uuid.UUID, readingDate string, value float64, createdBy *uuid.UUID) (Reading, error) {
	var r Reading
	err := s.pool.QueryRow(ctx,
		`INSERT INTO meter_readings (tenant_id, meter_id, reading_date, value, created_by) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, meter_id, reading_date, value, created_by, created_at`,
		tenantID, meterID, readingDate, value, createdBy,
	).Scan(&r.ID, &r.TenantID, &r.MeterID, &r.ReadingDate, &r.Value, &r.CreatedBy, &r.CreatedAt)
	return r, err
}

type BulkReadingInput struct {
	MeterID     uuid.UUID
	ReadingDate string
	Value       float64
}

// BulkCreateReadings (Toplu okuma): birden fazla sayaç için aynı anda endeks girişi yapar.
func (s *Service) BulkCreateReadings(ctx context.Context, tenantID uuid.UUID, inputs []BulkReadingInput, createdBy *uuid.UUID) ([]Reading, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	readings := make([]Reading, 0, len(inputs))
	for _, in := range inputs {
		var r Reading
		err := tx.QueryRow(ctx,
			`INSERT INTO meter_readings (tenant_id, meter_id, reading_date, value, created_by) VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, tenant_id, meter_id, reading_date, value, created_by, created_at`,
			tenantID, in.MeterID, in.ReadingDate, in.Value, createdBy,
		).Scan(&r.ID, &r.TenantID, &r.MeterID, &r.ReadingDate, &r.Value, &r.CreatedBy, &r.CreatedAt)
		if err != nil {
			return nil, err
		}
		readings = append(readings, r)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return readings, nil
}

func (s *Service) ListReadings(ctx context.Context, tenantID, meterID uuid.UUID) ([]Reading, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, meter_id, reading_date, value, created_by, created_at
		 FROM meter_readings WHERE tenant_id = $1 AND meter_id = $2 ORDER BY reading_date DESC, created_at DESC`, tenantID, meterID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Reading{}
	for rows.Next() {
		var r Reading
		if err := rows.Scan(&r.ID, &r.TenantID, &r.MeterID, &r.ReadingDate, &r.Value, &r.CreatedBy, &r.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

// GetConsumptionHistory (Tüketim analizleri): ardışık okumalar arasındaki tüketimleri hesaplar.
func (s *Service) GetConsumptionHistory(ctx context.Context, tenantID, meterID uuid.UUID) ([]ConsumptionEntry, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT reading_date, value FROM meter_readings
		 WHERE tenant_id = $1 AND meter_id = $2 ORDER BY reading_date ASC, created_at ASC`, tenantID, meterID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var readings []Reading
	for rows.Next() {
		var r Reading
		if err := rows.Scan(&r.ReadingDate, &r.Value); err != nil {
			return nil, err
		}
		readings = append(readings, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	entries := make([]ConsumptionEntry, 0, len(readings))
	for i := 1; i < len(readings); i++ {
		entries = append(entries, ConsumptionEntry{
			FromDate:    readings[i-1].ReadingDate,
			ToDate:      readings[i].ReadingDate,
			FromValue:   readings[i-1].Value,
			ToValue:     readings[i].Value,
			Consumption: readings[i].Value - readings[i-1].Value,
		})
	}
	return entries, nil
}

// LatestConsumption, faturalandırma için en son iki okuma arasındaki tüketimi döner.
func (s *Service) LatestConsumption(ctx context.Context, tenantID, meterID uuid.UUID) (ConsumptionEntry, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT reading_date, value FROM meter_readings
		 WHERE tenant_id = $1 AND meter_id = $2 ORDER BY reading_date DESC, created_at DESC LIMIT 2`, tenantID, meterID,
	)
	if err != nil {
		return ConsumptionEntry{}, err
	}
	defer rows.Close()

	var readings []Reading
	for rows.Next() {
		var r Reading
		if err := rows.Scan(&r.ReadingDate, &r.Value); err != nil {
			return ConsumptionEntry{}, err
		}
		readings = append(readings, r)
	}
	if err := rows.Err(); err != nil {
		return ConsumptionEntry{}, err
	}
	if len(readings) < 2 {
		return ConsumptionEntry{}, ErrNotEnoughReadings
	}

	// readings[0] en son, readings[1] bir önceki
	return ConsumptionEntry{
		FromDate:    readings[1].ReadingDate,
		ToDate:      readings[0].ReadingDate,
		FromValue:   readings[1].Value,
		ToValue:     readings[0].Value,
		Consumption: readings[0].Value - readings[1].Value,
	}, nil
}
