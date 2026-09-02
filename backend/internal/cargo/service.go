package cargo

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

const selectColumns = `id, tenant_id, site_id, unit_id, recipient_person_id, courier_company, tracking_no, description, status, received_at, received_by, delivered_at, delivered_to, notified_at, created_at`

func scanDelivery(row pgx.Row) (Delivery, error) {
	var d Delivery
	err := row.Scan(&d.ID, &d.TenantID, &d.SiteID, &d.UnitID, &d.RecipientPersonID, &d.CourierCompany, &d.TrackingNo, &d.Description, &d.Status, &d.ReceivedAt, &d.ReceivedBy, &d.DeliveredAt, &d.DeliveredTo, &d.NotifiedAt, &d.CreatedAt)
	return d, err
}

func (s *Service) CreateDelivery(ctx context.Context, tenantID, siteID uuid.UUID, unitID, recipientPersonID *uuid.UUID, courierCompany, trackingNo, description *string, receivedBy *uuid.UUID) (Delivery, error) {
	return scanDelivery(s.pool.QueryRow(ctx,
		`INSERT INTO cargo_deliveries (tenant_id, site_id, unit_id, recipient_person_id, courier_company, tracking_no, description, received_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING `+selectColumns,
		tenantID, siteID, unitID, recipientPersonID, courierCompany, trackingNo, description, receivedBy,
	))
}

func (s *Service) ListDeliveries(ctx context.Context, tenantID, siteID uuid.UUID) ([]Delivery, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+selectColumns+` FROM cargo_deliveries WHERE tenant_id = $1 AND site_id = $2 ORDER BY received_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Delivery{}
	for rows.Next() {
		d, err := scanDelivery(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

func (s *Service) DeliverToResident(ctx context.Context, tenantID, deliveryID uuid.UUID, deliveredTo string) (Delivery, error) {
	d, err := scanDelivery(s.pool.QueryRow(ctx,
		`UPDATE cargo_deliveries SET status = 'sakine_teslim_edildi', delivered_at = now(), delivered_to = $1
		 WHERE id = $2 AND tenant_id = $3 AND status = 'teslim_alindi'
		 RETURNING `+selectColumns,
		deliveredTo, deliveryID, tenantID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return Delivery{}, ErrNotFound
	}
	return d, err
}

func (s *Service) MarkReturned(ctx context.Context, tenantID, deliveryID uuid.UUID) (Delivery, error) {
	d, err := scanDelivery(s.pool.QueryRow(ctx,
		`UPDATE cargo_deliveries SET status = 'iade' WHERE id = $1 AND tenant_id = $2 AND status = 'teslim_alindi'
		 RETURNING `+selectColumns,
		deliveryID, tenantID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return Delivery{}, ErrNotFound
	}
	return d, err
}

// NotifyRecipient sakine kargo geldiğine dair bildirim gönderildiğini işaretler.
// Gerçek SMS/push/WhatsApp gönderimi Entegrasyonlar modülüne (26) bırakıldı.
func (s *Service) NotifyRecipient(ctx context.Context, tenantID, deliveryID uuid.UUID) (Delivery, error) {
	d, err := scanDelivery(s.pool.QueryRow(ctx,
		`UPDATE cargo_deliveries SET notified_at = now() WHERE id = $1 AND tenant_id = $2
		 RETURNING `+selectColumns,
		deliveryID, tenantID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return Delivery{}, ErrNotFound
	}
	return d, err
}
