package inventory

import (
	"context"
	"errors"
	"time"

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

// --- Assets ---

type AssetInput struct {
	Name            string
	SerialNo        *string
	Category        *string
	PurchaseDate    *string
	PurchasePrice   *float64
	UsefulLifeYears *int
	WarrantyUntil   *string
}

func (s *Service) CreateAsset(ctx context.Context, tenantID, siteID uuid.UUID, in AssetInput) (Asset, error) {
	var a Asset
	err := s.pool.QueryRow(ctx,
		`INSERT INTO assets (tenant_id, site_id, name, serial_no, category, purchase_date, purchase_price, useful_life_years, warranty_until)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, tenant_id, site_id, name, serial_no, category, purchase_date, purchase_price, useful_life_years, warranty_until, status, assigned_to, created_at, updated_at`,
		tenantID, siteID, in.Name, in.SerialNo, in.Category, in.PurchaseDate, in.PurchasePrice, in.UsefulLifeYears, in.WarrantyUntil,
	).Scan(&a.ID, &a.TenantID, &a.SiteID, &a.Name, &a.SerialNo, &a.Category, &a.PurchaseDate, &a.PurchasePrice, &a.UsefulLifeYears, &a.WarrantyUntil, &a.Status, &a.AssignedTo, &a.CreatedAt, &a.UpdatedAt)
	return a, err
}

func (s *Service) ListAssets(ctx context.Context, tenantID, siteID uuid.UUID) ([]Asset, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, name, serial_no, category, purchase_date, purchase_price, useful_life_years, warranty_until, status, assigned_to, created_at, updated_at
		 FROM assets WHERE tenant_id = $1 AND site_id = $2 ORDER BY name`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Asset{}
	for rows.Next() {
		var a Asset
		if err := rows.Scan(&a.ID, &a.TenantID, &a.SiteID, &a.Name, &a.SerialNo, &a.Category, &a.PurchaseDate, &a.PurchasePrice, &a.UsefulLifeYears, &a.WarrantyUntil, &a.Status, &a.AssignedTo, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}

func (s *Service) GetAsset(ctx context.Context, tenantID, assetID uuid.UUID) (Asset, error) {
	var a Asset
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, site_id, name, serial_no, category, purchase_date, purchase_price, useful_life_years, warranty_until, status, assigned_to, created_at, updated_at
		 FROM assets WHERE id = $1 AND tenant_id = $2`, assetID, tenantID,
	).Scan(&a.ID, &a.TenantID, &a.SiteID, &a.Name, &a.SerialNo, &a.Category, &a.PurchaseDate, &a.PurchasePrice, &a.UsefulLifeYears, &a.WarrantyUntil, &a.Status, &a.AssignedTo, &a.CreatedAt, &a.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Asset{}, ErrNotFound
	}
	return a, err
}

// Depreciation (Amortisman hesapları): doğrusal amortisman yöntemi.
func (s *Service) Depreciation(ctx context.Context, tenantID, assetID uuid.UUID) (Depreciation, error) {
	a, err := s.GetAsset(ctx, tenantID, assetID)
	if err != nil {
		return Depreciation{}, err
	}
	d := Depreciation{AssetID: a.ID}
	if a.PurchasePrice == nil || a.UsefulLifeYears == nil || *a.UsefulLifeYears <= 0 || a.PurchaseDate == nil {
		return d, nil
	}
	d.PurchasePrice = *a.PurchasePrice
	d.UsefulLifeYears = *a.UsefulLifeYears
	d.AnnualAmount = d.PurchasePrice / float64(d.UsefulLifeYears)
	d.AgeYears = time.Since(*a.PurchaseDate).Hours() / 24 / 365.25
	if d.AgeYears > float64(d.UsefulLifeYears) {
		d.AgeYears = float64(d.UsefulLifeYears)
	}
	d.AccumulatedAmount = d.AnnualAmount * d.AgeYears
	d.BookValue = d.PurchasePrice - d.AccumulatedAmount
	return d, nil
}

// --- Assignments (Zimmet İşlemleri) ---

func (s *Service) AssignAsset(ctx context.Context, tenantID, assetID, userID uuid.UUID, note *string, createdBy *uuid.UUID) (Assignment, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Assignment{}, err
	}
	defer tx.Rollback(ctx)

	var asg Assignment
	err = tx.QueryRow(ctx,
		`INSERT INTO asset_assignments (tenant_id, asset_id, assigned_to, note, created_by) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, asset_id, assigned_to, assigned_at, returned_at, note, created_by`,
		tenantID, assetID, userID, note, createdBy,
	).Scan(&asg.ID, &asg.TenantID, &asg.AssetID, &asg.AssignedTo, &asg.AssignedAt, &asg.ReturnedAt, &asg.Note, &asg.CreatedBy)
	if err != nil {
		return Assignment{}, err
	}

	if _, err := tx.Exec(ctx,
		`UPDATE assets SET status = 'zimmetli', assigned_to = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
		userID, assetID, tenantID,
	); err != nil {
		return Assignment{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Assignment{}, err
	}
	return asg, nil
}

func (s *Service) ReturnAsset(ctx context.Context, tenantID, assetID uuid.UUID) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx,
		`UPDATE asset_assignments SET returned_at = now()
		 WHERE asset_id = $1 AND tenant_id = $2 AND returned_at IS NULL`,
		assetID, tenantID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if _, err := tx.Exec(ctx,
		`UPDATE assets SET status = 'depoda', assigned_to = NULL, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
		assetID, tenantID,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *Service) ListAssignments(ctx context.Context, tenantID, assetID uuid.UUID) ([]Assignment, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, asset_id, assigned_to, assigned_at, returned_at, note, created_by
		 FROM asset_assignments WHERE tenant_id = $1 AND asset_id = $2 ORDER BY assigned_at DESC`, tenantID, assetID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Assignment{}
	for rows.Next() {
		var a Assignment
		if err := rows.Scan(&a.ID, &a.TenantID, &a.AssetID, &a.AssignedTo, &a.AssignedAt, &a.ReturnedAt, &a.Note, &a.CreatedBy); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}

// --- Counts (Sayım İşlemleri) ---

func (s *Service) CreateCount(ctx context.Context, tenantID, siteID uuid.UUID, note *string, createdBy *uuid.UUID) (Count, error) {
	var c Count
	err := s.pool.QueryRow(ctx,
		`INSERT INTO asset_counts (tenant_id, site_id, note, created_by) VALUES ($1, $2, $3, $4)
		 RETURNING id, tenant_id, site_id, count_date, note, created_by, created_at`,
		tenantID, siteID, note, createdBy,
	).Scan(&c.ID, &c.TenantID, &c.SiteID, &c.CountDate, &c.Note, &c.CreatedBy, &c.CreatedAt)
	return c, err
}

func (s *Service) ListCounts(ctx context.Context, tenantID, siteID uuid.UUID) ([]Count, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, count_date, note, created_by, created_at
		 FROM asset_counts WHERE tenant_id = $1 AND site_id = $2 ORDER BY count_date DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Count{}
	for rows.Next() {
		var c Count
		if err := rows.Scan(&c.ID, &c.TenantID, &c.SiteID, &c.CountDate, &c.Note, &c.CreatedBy, &c.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

func (s *Service) AddCountItem(ctx context.Context, tenantID, countID, assetID uuid.UUID, found bool, note *string) (CountItem, error) {
	var ci CountItem
	err := s.pool.QueryRow(ctx,
		`INSERT INTO asset_count_items (tenant_id, count_id, asset_id, found, note) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, count_id, asset_id, found, note`,
		tenantID, countID, assetID, found, note,
	).Scan(&ci.ID, &ci.CountID, &ci.AssetID, &ci.Found, &ci.Note)
	return ci, err
}

func (s *Service) ListCountItems(ctx context.Context, tenantID, countID uuid.UUID) ([]CountItem, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, count_id, asset_id, found, note FROM asset_count_items WHERE tenant_id = $1 AND count_id = $2`, tenantID, countID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []CountItem{}
	for rows.Next() {
		var ci CountItem
		if err := rows.Scan(&ci.ID, &ci.CountID, &ci.AssetID, &ci.Found, &ci.Note); err != nil {
			return nil, err
		}
		list = append(list, ci)
	}
	return list, rows.Err()
}
