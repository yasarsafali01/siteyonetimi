package visitor

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("kayıt bulunamadı")
var ErrInvalidInvitation = errors.New("davetiye geçersiz veya kullanılamaz")

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// --- Invitations (QR Davetiye + Onay Mekanizması) ---

func (s *Service) CreateInvitation(ctx context.Context, tenantID, siteID uuid.UUID, unitID, hostPersonID *uuid.UUID, visitorName string, visitorPhone, vehiclePlate *string, validUntil string, createdBy *uuid.UUID) (Invitation, error) {
	var inv Invitation
	err := s.pool.QueryRow(ctx,
		`INSERT INTO visitor_invitations (tenant_id, site_id, unit_id, host_person_id, visitor_name, visitor_phone, vehicle_plate, valid_until, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, tenant_id, site_id, unit_id, host_person_id, visitor_name, visitor_phone, vehicle_plate, invitation_code, valid_from, valid_until, status, approved_by, approved_at, created_by, created_at`,
		tenantID, siteID, unitID, hostPersonID, visitorName, visitorPhone, vehiclePlate, validUntil, createdBy,
	).Scan(&inv.ID, &inv.TenantID, &inv.SiteID, &inv.UnitID, &inv.HostPersonID, &inv.VisitorName, &inv.VisitorPhone, &inv.VehiclePlate, &inv.InvitationCode, &inv.ValidFrom, &inv.ValidUntil, &inv.Status, &inv.ApprovedBy, &inv.ApprovedAt, &inv.CreatedBy, &inv.CreatedAt)
	return inv, err
}

func (s *Service) ListInvitations(ctx context.Context, tenantID, siteID uuid.UUID) ([]Invitation, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, unit_id, host_person_id, visitor_name, visitor_phone, vehicle_plate, invitation_code, valid_from, valid_until, status, approved_by, approved_at, created_by, created_at
		 FROM visitor_invitations WHERE tenant_id = $1 AND site_id = $2 ORDER BY created_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Invitation{}
	for rows.Next() {
		var inv Invitation
		if err := rows.Scan(&inv.ID, &inv.TenantID, &inv.SiteID, &inv.UnitID, &inv.HostPersonID, &inv.VisitorName, &inv.VisitorPhone, &inv.VehiclePlate, &inv.InvitationCode, &inv.ValidFrom, &inv.ValidUntil, &inv.Status, &inv.ApprovedBy, &inv.ApprovedAt, &inv.CreatedBy, &inv.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, inv)
	}
	return list, rows.Err()
}

func (s *Service) DecideInvitation(ctx context.Context, tenantID, invitationID uuid.UUID, approve bool, decidedBy *uuid.UUID) (Invitation, error) {
	status := "reddedildi"
	if approve {
		status = "onaylandi"
	}
	var inv Invitation
	err := s.pool.QueryRow(ctx,
		`UPDATE visitor_invitations SET status = $1, approved_by = $2, approved_at = now()
		 WHERE id = $3 AND tenant_id = $4 AND status = 'bekliyor'
		 RETURNING id, tenant_id, site_id, unit_id, host_person_id, visitor_name, visitor_phone, vehicle_plate, invitation_code, valid_from, valid_until, status, approved_by, approved_at, created_by, created_at`,
		status, decidedBy, invitationID, tenantID,
	).Scan(&inv.ID, &inv.TenantID, &inv.SiteID, &inv.UnitID, &inv.HostPersonID, &inv.VisitorName, &inv.VisitorPhone, &inv.VehiclePlate, &inv.InvitationCode, &inv.ValidFrom, &inv.ValidUntil, &inv.Status, &inv.ApprovedBy, &inv.ApprovedAt, &inv.CreatedBy, &inv.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Invitation{}, ErrNotFound
	}
	return inv, err
}

// findInvitationByCode getirir; devriye/güvenlik girişte QR kodu okutunca kullanılır.
func (s *Service) findInvitationByCode(ctx context.Context, tenantID uuid.UUID, code string) (Invitation, error) {
	var inv Invitation
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, site_id, unit_id, host_person_id, visitor_name, visitor_phone, vehicle_plate, invitation_code, valid_from, valid_until, status, approved_by, approved_at, created_by, created_at
		 FROM visitor_invitations WHERE tenant_id = $1 AND invitation_code = $2`, tenantID, code,
	).Scan(&inv.ID, &inv.TenantID, &inv.SiteID, &inv.UnitID, &inv.HostPersonID, &inv.VisitorName, &inv.VisitorPhone, &inv.VehiclePlate, &inv.InvitationCode, &inv.ValidFrom, &inv.ValidUntil, &inv.Status, &inv.ApprovedBy, &inv.ApprovedAt, &inv.CreatedBy, &inv.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Invitation{}, ErrNotFound
	}
	return inv, err
}

// --- Logs (Giriş Çıkış Kayıtları + Geçici Kartlar + Araç Kaydı) ---

// CheckInWithCode bir QR davetiye koduyla giriş kaydı oluşturur; davetiyeyi onaylıysa ve
// süresi geçmemişse "kullanildi" olarak işaretler.
func (s *Service) CheckInWithCode(ctx context.Context, tenantID, siteID uuid.UUID, code string, tempCardNo *string, checkedInBy *uuid.UUID) (Log, error) {
	inv, err := s.findInvitationByCode(ctx, tenantID, code)
	if err != nil {
		return Log{}, err
	}
	if inv.SiteID != siteID || inv.Status != "onaylandi" {
		return Log{}, ErrInvalidInvitation
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Log{}, err
	}
	defer tx.Rollback(ctx)

	var lg Log
	err = tx.QueryRow(ctx,
		`INSERT INTO visitor_logs (tenant_id, site_id, unit_id, invitation_id, visitor_name, visitor_phone, vehicle_plate, temp_card_no, checked_in_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, tenant_id, site_id, unit_id, invitation_id, visitor_name, visitor_phone, id_number, vehicle_plate, temp_card_no, checked_in_at, checked_in_by, checked_out_at, checked_out_by, note`,
		tenantID, siteID, inv.UnitID, inv.ID, inv.VisitorName, inv.VisitorPhone, inv.VehiclePlate, tempCardNo, checkedInBy,
	).Scan(&lg.ID, &lg.TenantID, &lg.SiteID, &lg.UnitID, &lg.InvitationID, &lg.VisitorName, &lg.VisitorPhone, &lg.IDNumber, &lg.VehiclePlate, &lg.TempCardNo, &lg.CheckedInAt, &lg.CheckedInBy, &lg.CheckedOutAt, &lg.CheckedOutBy, &lg.Note)
	if err != nil {
		return Log{}, err
	}

	if _, err := tx.Exec(ctx, `UPDATE visitor_invitations SET status = 'kullanildi' WHERE id = $1`, inv.ID); err != nil {
		return Log{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Log{}, err
	}
	return lg, nil
}

// CheckInWalkIn davetiyesiz, doğrudan güvenlik tarafından açılan giriş kaydı.
func (s *Service) CheckInWalkIn(ctx context.Context, tenantID, siteID uuid.UUID, unitID *uuid.UUID, visitorName string, visitorPhone, idNumber, vehiclePlate, tempCardNo, note *string, checkedInBy *uuid.UUID) (Log, error) {
	var lg Log
	err := s.pool.QueryRow(ctx,
		`INSERT INTO visitor_logs (tenant_id, site_id, unit_id, visitor_name, visitor_phone, id_number, vehicle_plate, temp_card_no, note, checked_in_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, tenant_id, site_id, unit_id, invitation_id, visitor_name, visitor_phone, id_number, vehicle_plate, temp_card_no, checked_in_at, checked_in_by, checked_out_at, checked_out_by, note`,
		tenantID, siteID, unitID, visitorName, visitorPhone, idNumber, vehiclePlate, tempCardNo, note, checkedInBy,
	).Scan(&lg.ID, &lg.TenantID, &lg.SiteID, &lg.UnitID, &lg.InvitationID, &lg.VisitorName, &lg.VisitorPhone, &lg.IDNumber, &lg.VehiclePlate, &lg.TempCardNo, &lg.CheckedInAt, &lg.CheckedInBy, &lg.CheckedOutAt, &lg.CheckedOutBy, &lg.Note)
	return lg, err
}

func (s *Service) CheckOut(ctx context.Context, tenantID, logID uuid.UUID, checkedOutBy *uuid.UUID) (Log, error) {
	var lg Log
	err := s.pool.QueryRow(ctx,
		`UPDATE visitor_logs SET checked_out_at = now(), checked_out_by = $1
		 WHERE id = $2 AND tenant_id = $3 AND checked_out_at IS NULL
		 RETURNING id, tenant_id, site_id, unit_id, invitation_id, visitor_name, visitor_phone, id_number, vehicle_plate, temp_card_no, checked_in_at, checked_in_by, checked_out_at, checked_out_by, note`,
		checkedOutBy, logID, tenantID,
	).Scan(&lg.ID, &lg.TenantID, &lg.SiteID, &lg.UnitID, &lg.InvitationID, &lg.VisitorName, &lg.VisitorPhone, &lg.IDNumber, &lg.VehiclePlate, &lg.TempCardNo, &lg.CheckedInAt, &lg.CheckedInBy, &lg.CheckedOutAt, &lg.CheckedOutBy, &lg.Note)
	if errors.Is(err, pgx.ErrNoRows) {
		return Log{}, ErrNotFound
	}
	return lg, err
}

func (s *Service) ListLogs(ctx context.Context, tenantID, siteID uuid.UUID) ([]Log, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, unit_id, invitation_id, visitor_name, visitor_phone, id_number, vehicle_plate, temp_card_no, checked_in_at, checked_in_by, checked_out_at, checked_out_by, note
		 FROM visitor_logs WHERE tenant_id = $1 AND site_id = $2 ORDER BY checked_in_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Log{}
	for rows.Next() {
		var lg Log
		if err := rows.Scan(&lg.ID, &lg.TenantID, &lg.SiteID, &lg.UnitID, &lg.InvitationID, &lg.VisitorName, &lg.VisitorPhone, &lg.IDNumber, &lg.VehiclePlate, &lg.TempCardNo, &lg.CheckedInAt, &lg.CheckedInBy, &lg.CheckedOutAt, &lg.CheckedOutBy, &lg.Note); err != nil {
			return nil, err
		}
		list = append(list, lg)
	}
	return list, rows.Err()
}
