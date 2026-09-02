package access

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

// --- Access Points (Bariyer / Turnike / Kapı) ---

func (s *Service) CreatePoint(ctx context.Context, tenantID, siteID uuid.UUID, name, pointType string, location *string) (Point, error) {
	var p Point
	err := s.pool.QueryRow(ctx,
		`INSERT INTO access_points (tenant_id, site_id, name, type, location) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, site_id, name, type, location, is_active, created_at`,
		tenantID, siteID, name, pointType, location,
	).Scan(&p.ID, &p.TenantID, &p.SiteID, &p.Name, &p.Type, &p.Location, &p.IsActive, &p.CreatedAt)
	return p, err
}

func (s *Service) ListPoints(ctx context.Context, tenantID, siteID uuid.UUID) ([]Point, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, name, type, location, is_active, created_at
		 FROM access_points WHERE tenant_id = $1 AND site_id = $2 ORDER BY name`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Point{}
	for rows.Next() {
		var p Point
		if err := rows.Scan(&p.ID, &p.TenantID, &p.SiteID, &p.Name, &p.Type, &p.Location, &p.IsActive, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

// --- Credentials (QR / NFC / Kart / Plaka) ---

func (s *Service) CreateCredential(ctx context.Context, tenantID, siteID uuid.UUID, personID, unitID *uuid.UUID, credType, value string, validUntil *string) (Credential, error) {
	var c Credential
	err := s.pool.QueryRow(ctx,
		`INSERT INTO access_credentials (tenant_id, site_id, person_id, unit_id, type, credential_value, valid_until)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, tenant_id, site_id, person_id, unit_id, type, credential_value, is_active, valid_from, valid_until, created_at`,
		tenantID, siteID, personID, unitID, credType, value, validUntil,
	).Scan(&c.ID, &c.TenantID, &c.SiteID, &c.PersonID, &c.UnitID, &c.Type, &c.CredentialValue, &c.IsActive, &c.ValidFrom, &c.ValidUntil, &c.CreatedAt)
	return c, err
}

func (s *Service) ListCredentials(ctx context.Context, tenantID, siteID uuid.UUID) ([]Credential, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, person_id, unit_id, type, credential_value, is_active, valid_from, valid_until, created_at
		 FROM access_credentials WHERE tenant_id = $1 AND site_id = $2 ORDER BY created_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Credential{}
	for rows.Next() {
		var c Credential
		if err := rows.Scan(&c.ID, &c.TenantID, &c.SiteID, &c.PersonID, &c.UnitID, &c.Type, &c.CredentialValue, &c.IsActive, &c.ValidFrom, &c.ValidUntil, &c.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

func (s *Service) RevokeCredential(ctx context.Context, tenantID, credentialID uuid.UUID) (Credential, error) {
	var c Credential
	err := s.pool.QueryRow(ctx,
		`UPDATE access_credentials SET is_active = FALSE WHERE id = $1 AND tenant_id = $2
		 RETURNING id, tenant_id, site_id, person_id, unit_id, type, credential_value, is_active, valid_from, valid_until, created_at`,
		credentialID, tenantID,
	).Scan(&c.ID, &c.TenantID, &c.SiteID, &c.PersonID, &c.UnitID, &c.Type, &c.CredentialValue, &c.IsActive, &c.ValidFrom, &c.ValidUntil, &c.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Credential{}, ErrNotFound
	}
	return c, err
}

// --- Scan (Bariyer/Turnike Açma Denemesi) ---

// Scan bir geçiş noktasında okutulan kimlik bilgisini (QR/NFC/kart/plaka) değerlendirir;
// aktif ve geçerlilik süresi içindeki eşleşen kayıt varsa geçişe izin verir (granted=true)
// ve bunu access_logs'a işler — gerçek bariyer/turnike açma sinyali donanım entegrasyonu
// (modül 26) geldiğinde bu karara bağlanır.
func (s *Service) Scan(ctx context.Context, tenantID, siteID, accessPointID uuid.UUID, method, value string) (Log, error) {
	var cred Credential
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, site_id, person_id, unit_id, type, credential_value, is_active, valid_from, valid_until, created_at
		 FROM access_credentials
		 WHERE tenant_id = $1 AND site_id = $2 AND type = $3 AND credential_value = $4
		   AND is_active = TRUE AND valid_from <= now() AND (valid_until IS NULL OR valid_until >= now())`,
		tenantID, siteID, method, value,
	).Scan(&cred.ID, &cred.TenantID, &cred.SiteID, &cred.PersonID, &cred.UnitID, &cred.Type, &cred.CredentialValue, &cred.IsActive, &cred.ValidFrom, &cred.ValidUntil, &cred.CreatedAt)

	var credentialID *uuid.UUID
	granted := true
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return Log{}, err
		}
		granted = false
	} else {
		credentialID = &cred.ID
	}

	var lg Log
	err = s.pool.QueryRow(ctx,
		`INSERT INTO access_logs (tenant_id, site_id, access_point_id, credential_id, method, credential_value_snapshot, granted)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, tenant_id, site_id, access_point_id, credential_id, method, credential_value_snapshot, granted, occurred_at`,
		tenantID, siteID, accessPointID, credentialID, method, value, granted,
	).Scan(&lg.ID, &lg.TenantID, &lg.SiteID, &lg.AccessPointID, &lg.CredentialID, &lg.Method, &lg.CredentialValueSnapshot, &lg.Granted, &lg.OccurredAt)
	return lg, err
}

func (s *Service) ListLogs(ctx context.Context, tenantID, siteID uuid.UUID) ([]Log, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, access_point_id, credential_id, method, credential_value_snapshot, granted, occurred_at
		 FROM access_logs WHERE tenant_id = $1 AND site_id = $2 ORDER BY occurred_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Log{}
	for rows.Next() {
		var lg Log
		if err := rows.Scan(&lg.ID, &lg.TenantID, &lg.SiteID, &lg.AccessPointID, &lg.CredentialID, &lg.Method, &lg.CredentialValueSnapshot, &lg.Granted, &lg.OccurredAt); err != nil {
			return nil, err
		}
		list = append(list, lg)
	}
	return list, rows.Err()
}
