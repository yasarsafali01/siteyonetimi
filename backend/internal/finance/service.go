package finance

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("kayıt bulunamadı")
var ErrHasPayments = errors.New("ödemesi bulunan borç silinemez")

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// UnitSiteID, verilen bağımsız bölümün ait olduğu site_id'yi döner.
func (s *Service) UnitSiteID(ctx context.Context, tenantID, unitID uuid.UUID) (uuid.UUID, error) {
	var siteID uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT site_id FROM units WHERE id = $1 AND tenant_id = $2`, unitID, tenantID,
	).Scan(&siteID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrNotFound
	}
	return siteID, err
}

// --- Charges ---

type ChargeInput struct {
	Type        string
	Period      *string
	Description *string
	Amount      float64
	DueDate     *time.Time
}

func (s *Service) CreateCharge(ctx context.Context, tenantID, siteID, unitID uuid.UUID, in ChargeInput, createdBy *uuid.UUID) (Charge, error) {
	var c Charge
	err := s.pool.QueryRow(ctx,
		`INSERT INTO charges (tenant_id, site_id, unit_id, type, period, description, amount, due_date, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, tenant_id, site_id, unit_id, type, period, description, amount, due_date, created_by, created_at, updated_at`,
		tenantID, siteID, unitID, in.Type, in.Period, in.Description, in.Amount, in.DueDate, createdBy,
	).Scan(&c.ID, &c.TenantID, &c.SiteID, &c.UnitID, &c.Type, &c.Period, &c.Description, &c.Amount, &c.DueDate, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	return c, err
}

// BulkGenerateDues, bir sitedeki tüm aktif bağımsız bölümler için aidat katsayısına göre
// dönemsel aidat borcu oluşturur (Aylık aidat üretimi / Toplu aidat oluşturma).
func (s *Service) BulkGenerateDues(ctx context.Context, tenantID, siteID uuid.UUID, period string, dueDate time.Time, baseAmount float64, createdBy *uuid.UUID) ([]Charge, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, dues_coefficient FROM units WHERE tenant_id = $1 AND site_id = $2 AND is_active = TRUE`,
		tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	type unitCoef struct {
		id    uuid.UUID
		coeff float64
	}
	var units []unitCoef
	for rows.Next() {
		var u unitCoef
		if err := rows.Scan(&u.id, &u.coeff); err != nil {
			rows.Close()
			return nil, err
		}
		units = append(units, u)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	description := "Aylık aidat - " + period
	charges := make([]Charge, 0, len(units))
	for _, u := range units {
		var c Charge
		amount := baseAmount * u.coeff
		err := tx.QueryRow(ctx,
			`INSERT INTO charges (tenant_id, site_id, unit_id, type, period, description, amount, due_date, created_by)
			 VALUES ($1, $2, $3, 'aidat', $4, $5, $6, $7, $8)
			 RETURNING id, tenant_id, site_id, unit_id, type, period, description, amount, due_date, created_by, created_at, updated_at`,
			tenantID, siteID, u.id, period, description, amount, dueDate, createdBy,
		).Scan(&c.ID, &c.TenantID, &c.SiteID, &c.UnitID, &c.Type, &c.Period, &c.Description, &c.Amount, &c.DueDate, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			return nil, err
		}
		charges = append(charges, c)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return charges, nil
}

func (s *Service) ListChargesForUnit(ctx context.Context, tenantID, unitID uuid.UUID) ([]ChargeWithBalance, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT c.id, c.tenant_id, c.site_id, c.unit_id, c.type, c.period, c.description, c.amount, c.due_date, c.created_by, c.created_at, c.updated_at,
		        COALESCE(SUM(p.amount), 0) AS paid_amount
		 FROM charges c
		 LEFT JOIN payments p ON p.charge_id = c.id
		 WHERE c.tenant_id = $1 AND c.unit_id = $2
		 GROUP BY c.id
		 ORDER BY c.due_date DESC NULLS LAST, c.created_at DESC`,
		tenantID, unitID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []ChargeWithBalance{}
	for rows.Next() {
		var cw ChargeWithBalance
		if err := rows.Scan(&cw.ID, &cw.TenantID, &cw.SiteID, &cw.UnitID, &cw.Type, &cw.Period, &cw.Description, &cw.Amount, &cw.DueDate, &cw.CreatedBy, &cw.CreatedAt, &cw.UpdatedAt, &cw.PaidAmount); err != nil {
			return nil, err
		}
		cw.RemainingAmount = cw.Amount - cw.PaidAmount
		list = append(list, cw)
	}
	return list, rows.Err()
}

func (s *Service) ListChargesForSite(ctx context.Context, tenantID, siteID uuid.UUID) ([]ChargeWithBalance, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT c.id, c.tenant_id, c.site_id, c.unit_id, c.type, c.period, c.description, c.amount, c.due_date, c.created_by, c.created_at, c.updated_at,
		        COALESCE(SUM(p.amount), 0) AS paid_amount
		 FROM charges c
		 LEFT JOIN payments p ON p.charge_id = c.id
		 WHERE c.tenant_id = $1 AND c.site_id = $2
		 GROUP BY c.id
		 ORDER BY c.due_date DESC NULLS LAST, c.created_at DESC`,
		tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []ChargeWithBalance{}
	for rows.Next() {
		var cw ChargeWithBalance
		if err := rows.Scan(&cw.ID, &cw.TenantID, &cw.SiteID, &cw.UnitID, &cw.Type, &cw.Period, &cw.Description, &cw.Amount, &cw.DueDate, &cw.CreatedBy, &cw.CreatedAt, &cw.UpdatedAt, &cw.PaidAmount); err != nil {
			return nil, err
		}
		cw.RemainingAmount = cw.Amount - cw.PaidAmount
		list = append(list, cw)
	}
	return list, rows.Err()
}

func (s *Service) GetUnitBalance(ctx context.Context, tenantID, unitID uuid.UUID) (UnitBalance, error) {
	b := UnitBalance{UnitID: unitID}
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(c.amount), 0),
		        COALESCE((SELECT SUM(p.amount) FROM payments p JOIN charges c2 ON c2.id = p.charge_id WHERE c2.unit_id = $2 AND c2.tenant_id = $1), 0)
		 FROM charges c WHERE c.tenant_id = $1 AND c.unit_id = $2`,
		tenantID, unitID,
	).Scan(&b.TotalCharged, &b.TotalPaid)
	if err != nil {
		return b, err
	}
	b.RemainingAmount = b.TotalCharged - b.TotalPaid
	return b, nil
}

// GetPersonBalance, bir kişinin malik/kiracı olduğu tüm bağımsız bölümlerin toplam bakiyesini döner.
func (s *Service) GetPersonBalance(ctx context.Context, tenantID, personID uuid.UUID) (UnitBalance, error) {
	b := UnitBalance{}
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(c.amount), 0),
		        COALESCE((
		          SELECT SUM(p.amount) FROM payments p
		          JOIN charges c2 ON c2.id = p.charge_id
		          WHERE c2.tenant_id = $1 AND c2.unit_id IN (
		            SELECT unit_id FROM unit_residents WHERE tenant_id = $1 AND person_id = $2 AND is_active = TRUE
		          )
		        ), 0)
		 FROM charges c
		 WHERE c.tenant_id = $1 AND c.unit_id IN (
		   SELECT unit_id FROM unit_residents WHERE tenant_id = $1 AND person_id = $2 AND is_active = TRUE
		 )`,
		tenantID, personID,
	).Scan(&b.TotalCharged, &b.TotalPaid)
	if err != nil {
		return b, err
	}
	b.RemainingAmount = b.TotalCharged - b.TotalPaid
	return b, nil
}

func (s *Service) DeleteCharge(ctx context.Context, tenantID, chargeID uuid.UUID) error {
	var paymentCount int
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM payments WHERE charge_id = $1`, chargeID).Scan(&paymentCount); err != nil {
		return err
	}
	if paymentCount > 0 {
		return ErrHasPayments
	}
	tag, err := s.pool.Exec(ctx, `DELETE FROM charges WHERE id = $1 AND tenant_id = $2`, chargeID, tenantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Payments (manuel tahsilat) ---

func (s *Service) CreatePayment(ctx context.Context, tenantID, chargeID uuid.UUID, amount float64, method string, paidAt time.Time, note *string, createdBy *uuid.UUID) (Payment, error) {
	var p Payment
	err := s.pool.QueryRow(ctx,
		`INSERT INTO payments (tenant_id, charge_id, amount, method, paid_at, note, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, tenant_id, charge_id, amount, method, paid_at, note, created_by, created_at`,
		tenantID, chargeID, amount, method, paidAt, note, createdBy,
	).Scan(&p.ID, &p.TenantID, &p.ChargeID, &p.Amount, &p.Method, &p.PaidAt, &p.Note, &p.CreatedBy, &p.CreatedAt)
	return p, err
}

func (s *Service) ListPaymentsForCharge(ctx context.Context, tenantID, chargeID uuid.UUID) ([]Payment, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, charge_id, amount, method, paid_at, note, created_by, created_at
		 FROM payments WHERE tenant_id = $1 AND charge_id = $2 ORDER BY paid_at DESC`, tenantID, chargeID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Payment{}
	for rows.Next() {
		var p Payment
		if err := rows.Scan(&p.ID, &p.TenantID, &p.ChargeID, &p.Amount, &p.Method, &p.PaidAt, &p.Note, &p.CreatedBy, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

// ReassignPayment, bir ödemeyi başka bir borca aktarır (Mahsup işlemleri).
func (s *Service) ReassignPayment(ctx context.Context, tenantID, paymentID, newChargeID uuid.UUID) (Payment, error) {
	var p Payment
	err := s.pool.QueryRow(ctx,
		`UPDATE payments SET charge_id = $1
		 WHERE id = $2 AND tenant_id = $3
		 RETURNING id, tenant_id, charge_id, amount, method, paid_at, note, created_by, created_at`,
		newChargeID, paymentID, tenantID,
	).Scan(&p.ID, &p.TenantID, &p.ChargeID, &p.Amount, &p.Method, &p.PaidAt, &p.Note, &p.CreatedBy, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Payment{}, ErrNotFound
	}
	return p, err
}

func (s *Service) DeletePayment(ctx context.Context, tenantID, paymentID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM payments WHERE id = $1 AND tenant_id = $2`, paymentID, tenantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
