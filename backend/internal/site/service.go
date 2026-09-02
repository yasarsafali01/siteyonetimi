package site

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("kayıt bulunamadı")
var ErrManagerIneligible = errors.New("bu kullanıcı site yöneticisi olarak atanamaz — kullanıcı tipi 'yonetici' olmalı")

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// --- Sites ---

func (s *Service) CreateSite(ctx context.Context, tenantID uuid.UUID, name string, address *string) (Site, error) {
	var site Site
	err := s.pool.QueryRow(ctx,
		`INSERT INTO sites (tenant_id, name, address) VALUES ($1, $2, $3)
		 RETURNING id, tenant_id, name, address, is_active, created_at, updated_at`,
		tenantID, name, address,
	).Scan(&site.ID, &site.TenantID, &site.Name, &site.Address, &site.IsActive, &site.CreatedAt, &site.UpdatedAt)
	return site, err
}

func (s *Service) ListSites(ctx context.Context, tenantID uuid.UUID) ([]Site, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, name, address, is_active, created_at, updated_at
		 FROM sites WHERE tenant_id = $1 ORDER BY name`, tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sites := []Site{}
	for rows.Next() {
		var st Site
		if err := rows.Scan(&st.ID, &st.TenantID, &st.Name, &st.Address, &st.IsActive, &st.CreatedAt, &st.UpdatedAt); err != nil {
			return nil, err
		}
		sites = append(sites, st)
	}
	return sites, rows.Err()
}

// ListAccessibleSites, süper adminler için tüm siteleri; site yöneticisi olarak
// atanmış "yonetici" kullanıcılar için ise yalnızca kendilerine atanan siteleri döner.
func (s *Service) ListAccessibleSites(ctx context.Context, tenantID, userID uuid.UUID, isSuperAdmin bool) ([]Site, error) {
	if isSuperAdmin {
		return s.ListSites(ctx, tenantID)
	}

	rows, err := s.pool.Query(ctx,
		`SELECT s.id, s.tenant_id, s.name, s.address, s.is_active, s.created_at, s.updated_at
		 FROM sites s
		 JOIN site_managers sm ON sm.site_id = s.id
		 WHERE s.tenant_id = $1 AND sm.user_id = $2
		 ORDER BY s.name`, tenantID, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sites := []Site{}
	for rows.Next() {
		var st Site
		if err := rows.Scan(&st.ID, &st.TenantID, &st.Name, &st.Address, &st.IsActive, &st.CreatedAt, &st.UpdatedAt); err != nil {
			return nil, err
		}
		sites = append(sites, st)
	}
	return sites, rows.Err()
}

// UserHasSiteAccess, verilen kullanıcının bu siteye erişim yetkisi olup olmadığını döner.
// Çağıran taraf süper admin/sakin durumlarını ayrıca kontrol etmelidir — bu metod sadece
// site_managers atamasına bakar.
func (s *Service) UserHasSiteAccess(ctx context.Context, tenantID, userID, siteID uuid.UUID) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM site_managers WHERE tenant_id = $1 AND user_id = $2 AND site_id = $3)`,
		tenantID, userID, siteID,
	).Scan(&exists)
	return exists, err
}

// --- Site Managers ---

func (s *Service) ListManagers(ctx context.Context, tenantID, siteID uuid.UUID) ([]Manager, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT u.id, u.email, u.full_name
		 FROM site_managers sm
		 JOIN users u ON u.id = sm.user_id
		 WHERE sm.tenant_id = $1 AND sm.site_id = $2
		 ORDER BY u.full_name`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	managers := []Manager{}
	for rows.Next() {
		var m Manager
		if err := rows.Scan(&m.UserID, &m.Email, &m.FullName); err != nil {
			return nil, err
		}
		managers = append(managers, m)
	}
	return managers, rows.Err()
}

func (s *Service) AddManager(ctx context.Context, tenantID, siteID, userID uuid.UUID) error {
	var userType string
	var isSuperAdmin bool
	err := s.pool.QueryRow(ctx,
		`SELECT user_type, is_super_admin FROM users WHERE id = $1 AND tenant_id = $2`, userID, tenantID,
	).Scan(&userType, &isSuperAdmin)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if userType != "yonetici" || isSuperAdmin {
		return ErrManagerIneligible
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO site_managers (tenant_id, site_id, user_id) VALUES ($1, $2, $3)
		 ON CONFLICT (site_id, user_id) DO NOTHING`,
		tenantID, siteID, userID,
	)
	return err
}

func (s *Service) RemoveManager(ctx context.Context, tenantID, siteID, userID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM site_managers WHERE tenant_id = $1 AND site_id = $2 AND user_id = $3`,
		tenantID, siteID, userID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Service) GetSite(ctx context.Context, tenantID, siteID uuid.UUID) (Site, error) {
	var st Site
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, name, address, is_active, created_at, updated_at
		 FROM sites WHERE id = $1 AND tenant_id = $2`, siteID, tenantID,
	).Scan(&st.ID, &st.TenantID, &st.Name, &st.Address, &st.IsActive, &st.CreatedAt, &st.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Site{}, ErrNotFound
	}
	return st, err
}

func (s *Service) UpdateSite(ctx context.Context, tenantID, siteID uuid.UUID, name string, address *string, isActive bool) (Site, error) {
	var st Site
	err := s.pool.QueryRow(ctx,
		`UPDATE sites SET name = $1, address = $2, is_active = $3, updated_at = now()
		 WHERE id = $4 AND tenant_id = $5
		 RETURNING id, tenant_id, name, address, is_active, created_at, updated_at`,
		name, address, isActive, siteID, tenantID,
	).Scan(&st.ID, &st.TenantID, &st.Name, &st.Address, &st.IsActive, &st.CreatedAt, &st.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Site{}, ErrNotFound
	}
	return st, err
}

func (s *Service) DeactivateSite(ctx context.Context, tenantID, siteID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE sites SET is_active = FALSE, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
		siteID, tenantID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Blocks ---

func (s *Service) CreateBlock(ctx context.Context, tenantID, siteID uuid.UUID, name string, floorCount *int) (Block, error) {
	var b Block
	err := s.pool.QueryRow(ctx,
		`INSERT INTO blocks (tenant_id, site_id, name, floor_count) VALUES ($1, $2, $3, $4)
		 RETURNING id, tenant_id, site_id, name, floor_count, is_active, created_at, updated_at`,
		tenantID, siteID, name, floorCount,
	).Scan(&b.ID, &b.TenantID, &b.SiteID, &b.Name, &b.FloorCount, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)
	return b, err
}

func (s *Service) ListBlocks(ctx context.Context, tenantID, siteID uuid.UUID) ([]Block, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, name, floor_count, is_active, created_at, updated_at
		 FROM blocks WHERE tenant_id = $1 AND site_id = $2 ORDER BY name`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	blocks := []Block{}
	for rows.Next() {
		var b Block
		if err := rows.Scan(&b.ID, &b.TenantID, &b.SiteID, &b.Name, &b.FloorCount, &b.IsActive, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		blocks = append(blocks, b)
	}
	return blocks, rows.Err()
}

func (s *Service) UpdateBlock(ctx context.Context, tenantID, blockID uuid.UUID, name string, floorCount *int, isActive bool) (Block, error) {
	var b Block
	err := s.pool.QueryRow(ctx,
		`UPDATE blocks SET name = $1, floor_count = $2, is_active = $3, updated_at = now()
		 WHERE id = $4 AND tenant_id = $5
		 RETURNING id, tenant_id, site_id, name, floor_count, is_active, created_at, updated_at`,
		name, floorCount, isActive, blockID, tenantID,
	).Scan(&b.ID, &b.TenantID, &b.SiteID, &b.Name, &b.FloorCount, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Block{}, ErrNotFound
	}
	return b, err
}

func (s *Service) DeactivateBlock(ctx context.Context, tenantID, blockID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE blocks SET is_active = FALSE, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
		blockID, tenantID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// BlockSiteID, verilen bloğun bağlı olduğu site_id'yi döner (unit oluştururken denormalize alan için gerekli).
func (s *Service) BlockSiteID(ctx context.Context, tenantID, blockID uuid.UUID) (uuid.UUID, error) {
	var siteID uuid.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT site_id FROM blocks WHERE id = $1 AND tenant_id = $2`, blockID, tenantID,
	).Scan(&siteID)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrNotFound
	}
	return siteID, err
}

// --- Units ---

type UnitInput struct {
	UnitNumber      string
	Floor           *int
	Type            string
	GrossSqm        *float64
	NetSqm          *float64
	LandShare       *float64
	DuesCoefficient float64
	TitleDeedNo     *string
	TitleDeedType   *string
}

func (s *Service) CreateUnit(ctx context.Context, tenantID, siteID, blockID uuid.UUID, in UnitInput) (Unit, error) {
	var u Unit
	err := s.pool.QueryRow(ctx,
		`INSERT INTO units (tenant_id, site_id, block_id, unit_number, floor, type, gross_sqm, net_sqm, land_share, dues_coefficient, title_deed_no, title_deed_type)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 RETURNING id, tenant_id, site_id, block_id, unit_number, floor, type, gross_sqm, net_sqm, land_share, dues_coefficient, title_deed_no, title_deed_type, is_active, created_at, updated_at`,
		tenantID, siteID, blockID, in.UnitNumber, in.Floor, in.Type, in.GrossSqm, in.NetSqm, in.LandShare, in.DuesCoefficient, in.TitleDeedNo, in.TitleDeedType,
	).Scan(&u.ID, &u.TenantID, &u.SiteID, &u.BlockID, &u.UnitNumber, &u.Floor, &u.Type, &u.GrossSqm, &u.NetSqm, &u.LandShare, &u.DuesCoefficient, &u.TitleDeedNo, &u.TitleDeedType, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	return u, err
}

func (s *Service) ListUnits(ctx context.Context, tenantID, blockID uuid.UUID) ([]Unit, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, block_id, unit_number, floor, type, gross_sqm, net_sqm, land_share, dues_coefficient, title_deed_no, title_deed_type, is_active, created_at, updated_at
		 FROM units WHERE tenant_id = $1 AND block_id = $2 ORDER BY unit_number`, tenantID, blockID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	units := []Unit{}
	for rows.Next() {
		var u Unit
		if err := rows.Scan(&u.ID, &u.TenantID, &u.SiteID, &u.BlockID, &u.UnitNumber, &u.Floor, &u.Type, &u.GrossSqm, &u.NetSqm, &u.LandShare, &u.DuesCoefficient, &u.TitleDeedNo, &u.TitleDeedType, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		units = append(units, u)
	}
	return units, rows.Err()
}

func (s *Service) UpdateUnit(ctx context.Context, tenantID, unitID uuid.UUID, in UnitInput, isActive bool) (Unit, error) {
	var u Unit
	err := s.pool.QueryRow(ctx,
		`UPDATE units SET unit_number = $1, floor = $2, type = $3, gross_sqm = $4, net_sqm = $5, land_share = $6,
		   dues_coefficient = $7, title_deed_no = $8, title_deed_type = $9, is_active = $10, updated_at = now()
		 WHERE id = $11 AND tenant_id = $12
		 RETURNING id, tenant_id, site_id, block_id, unit_number, floor, type, gross_sqm, net_sqm, land_share, dues_coefficient, title_deed_no, title_deed_type, is_active, created_at, updated_at`,
		in.UnitNumber, in.Floor, in.Type, in.GrossSqm, in.NetSqm, in.LandShare, in.DuesCoefficient, in.TitleDeedNo, in.TitleDeedType, isActive, unitID, tenantID,
	).Scan(&u.ID, &u.TenantID, &u.SiteID, &u.BlockID, &u.UnitNumber, &u.Floor, &u.Type, &u.GrossSqm, &u.NetSqm, &u.LandShare, &u.DuesCoefficient, &u.TitleDeedNo, &u.TitleDeedType, &u.IsActive, &u.CreatedAt, &u.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Unit{}, ErrNotFound
	}
	return u, err
}

func (s *Service) DeactivateUnit(ctx context.Context, tenantID, unitID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE units SET is_active = FALSE, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
		unitID, tenantID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Common Areas ---

func (s *Service) CreateCommonArea(ctx context.Context, tenantID, siteID uuid.UUID, name string, description *string, areaSqm *float64) (CommonArea, error) {
	var ca CommonArea
	err := s.pool.QueryRow(ctx,
		`INSERT INTO common_areas (tenant_id, site_id, name, description, area_sqm) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, site_id, name, description, area_sqm, is_active, created_at, updated_at`,
		tenantID, siteID, name, description, areaSqm,
	).Scan(&ca.ID, &ca.TenantID, &ca.SiteID, &ca.Name, &ca.Description, &ca.AreaSqm, &ca.IsActive, &ca.CreatedAt, &ca.UpdatedAt)
	return ca, err
}

func (s *Service) ListCommonAreas(ctx context.Context, tenantID, siteID uuid.UUID) ([]CommonArea, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, name, description, area_sqm, is_active, created_at, updated_at
		 FROM common_areas WHERE tenant_id = $1 AND site_id = $2 ORDER BY name`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	areas := []CommonArea{}
	for rows.Next() {
		var ca CommonArea
		if err := rows.Scan(&ca.ID, &ca.TenantID, &ca.SiteID, &ca.Name, &ca.Description, &ca.AreaSqm, &ca.IsActive, &ca.CreatedAt, &ca.UpdatedAt); err != nil {
			return nil, err
		}
		areas = append(areas, ca)
	}
	return areas, rows.Err()
}

func (s *Service) DeactivateCommonArea(ctx context.Context, tenantID, areaID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE common_areas SET is_active = FALSE, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
		areaID, tenantID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
