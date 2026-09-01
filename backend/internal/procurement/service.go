package procurement

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

// --- Suppliers ---

func (s *Service) CreateSupplier(ctx context.Context, tenantID, siteID uuid.UUID, name string, contactName, phone, email *string) (Supplier, error) {
	var sp Supplier
	err := s.pool.QueryRow(ctx,
		`INSERT INTO suppliers (tenant_id, site_id, name, contact_name, phone, email) VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, site_id, name, contact_name, phone, email, is_active, created_at`,
		tenantID, siteID, name, contactName, phone, email,
	).Scan(&sp.ID, &sp.TenantID, &sp.SiteID, &sp.Name, &sp.ContactName, &sp.Phone, &sp.Email, &sp.IsActive, &sp.CreatedAt)
	return sp, err
}

func (s *Service) ListSuppliers(ctx context.Context, tenantID, siteID uuid.UUID) ([]Supplier, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, name, contact_name, phone, email, is_active, created_at
		 FROM suppliers WHERE tenant_id = $1 AND site_id = $2 ORDER BY name`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Supplier{}
	for rows.Next() {
		var sp Supplier
		if err := rows.Scan(&sp.ID, &sp.TenantID, &sp.SiteID, &sp.Name, &sp.ContactName, &sp.Phone, &sp.Email, &sp.IsActive, &sp.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, sp)
	}
	return list, rows.Err()
}

// --- Purchase Requests ---

func (s *Service) CreateRequest(ctx context.Context, tenantID, siteID uuid.UUID, title string, description *string, requestedBy *uuid.UUID) (PurchaseRequest, error) {
	var r PurchaseRequest
	err := s.pool.QueryRow(ctx,
		`INSERT INTO purchase_requests (tenant_id, site_id, title, description, requested_by) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, site_id, title, description, status, requested_by, approved_by, approved_at, created_at, updated_at`,
		tenantID, siteID, title, description, requestedBy,
	).Scan(&r.ID, &r.TenantID, &r.SiteID, &r.Title, &r.Description, &r.Status, &r.RequestedBy, &r.ApprovedBy, &r.ApprovedAt, &r.CreatedAt, &r.UpdatedAt)
	return r, err
}

func (s *Service) ListRequests(ctx context.Context, tenantID, siteID uuid.UUID, status string) ([]PurchaseRequest, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, title, description, status, requested_by, approved_by, approved_at, created_at, updated_at
		 FROM purchase_requests WHERE tenant_id = $1 AND site_id = $2 AND ($3 = '' OR status::text = $3) ORDER BY created_at DESC`,
		tenantID, siteID, status,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []PurchaseRequest{}
	for rows.Next() {
		var r PurchaseRequest
		if err := rows.Scan(&r.ID, &r.TenantID, &r.SiteID, &r.Title, &r.Description, &r.Status, &r.RequestedBy, &r.ApprovedBy, &r.ApprovedAt, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

func (s *Service) setRequestStatus(ctx context.Context, tenantID, requestID uuid.UUID, status string, approvedBy *uuid.UUID, setApproved bool) (PurchaseRequest, error) {
	var r PurchaseRequest
	var err error
	if setApproved {
		err = s.pool.QueryRow(ctx,
			`UPDATE purchase_requests SET status = $1, approved_by = $2, approved_at = now(), updated_at = now()
			 WHERE id = $3 AND tenant_id = $4
			 RETURNING id, tenant_id, site_id, title, description, status, requested_by, approved_by, approved_at, created_at, updated_at`,
			status, approvedBy, requestID, tenantID,
		).Scan(&r.ID, &r.TenantID, &r.SiteID, &r.Title, &r.Description, &r.Status, &r.RequestedBy, &r.ApprovedBy, &r.ApprovedAt, &r.CreatedAt, &r.UpdatedAt)
	} else {
		err = s.pool.QueryRow(ctx,
			`UPDATE purchase_requests SET status = $1, updated_at = now()
			 WHERE id = $2 AND tenant_id = $3
			 RETURNING id, tenant_id, site_id, title, description, status, requested_by, approved_by, approved_at, created_at, updated_at`,
			status, requestID, tenantID,
		).Scan(&r.ID, &r.TenantID, &r.SiteID, &r.Title, &r.Description, &r.Status, &r.RequestedBy, &r.ApprovedBy, &r.ApprovedAt, &r.CreatedAt, &r.UpdatedAt)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return PurchaseRequest{}, ErrNotFound
	}
	return r, err
}

func (s *Service) SubmitRequest(ctx context.Context, tenantID, requestID uuid.UUID) (PurchaseRequest, error) {
	return s.setRequestStatus(ctx, tenantID, requestID, "onay_bekliyor", nil, false)
}

func (s *Service) ApproveRequest(ctx context.Context, tenantID, requestID uuid.UUID, approvedBy *uuid.UUID) (PurchaseRequest, error) {
	return s.setRequestStatus(ctx, tenantID, requestID, "onaylandi", approvedBy, true)
}

func (s *Service) RejectRequest(ctx context.Context, tenantID, requestID uuid.UUID, approvedBy *uuid.UUID) (PurchaseRequest, error) {
	return s.setRequestStatus(ctx, tenantID, requestID, "reddedildi", approvedBy, true)
}

// --- Quotes (Teklif Toplama) ---

func (s *Service) CreateQuote(ctx context.Context, tenantID, requestID, supplierID uuid.UUID, amount float64, note *string) (Quote, error) {
	var q Quote
	err := s.pool.QueryRow(ctx,
		`INSERT INTO quotes (tenant_id, request_id, supplier_id, amount, note) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, request_id, supplier_id, amount, note, is_selected, created_at`,
		tenantID, requestID, supplierID, amount, note,
	).Scan(&q.ID, &q.TenantID, &q.RequestID, &q.SupplierID, &q.Amount, &q.Note, &q.IsSelected, &q.CreatedAt)
	return q, err
}

func (s *Service) ListQuotes(ctx context.Context, tenantID, requestID uuid.UUID) ([]Quote, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, request_id, supplier_id, amount, note, is_selected, created_at
		 FROM quotes WHERE tenant_id = $1 AND request_id = $2 ORDER BY amount`, tenantID, requestID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Quote{}
	for rows.Next() {
		var q Quote
		if err := rows.Scan(&q.ID, &q.TenantID, &q.RequestID, &q.SupplierID, &q.Amount, &q.Note, &q.IsSelected, &q.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, q)
	}
	return list, rows.Err()
}

// SelectQuoteAndOrder (Onay akışları + Sipariş yönetimi): bir teklifi seçer, talebi "sipariş
// verildi" durumuna taşır ve seçilen tedarikçi/tutarla bir sipariş oluşturur.
func (s *Service) SelectQuoteAndOrder(ctx context.Context, tenantID, requestID, quoteID uuid.UUID, createdBy *uuid.UUID) (PurchaseOrder, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return PurchaseOrder{}, err
	}
	defer tx.Rollback(ctx)

	var siteID, supplierID uuid.UUID
	var amount float64
	err = tx.QueryRow(ctx,
		`SELECT pr.site_id, q.supplier_id, q.amount FROM quotes q
		 JOIN purchase_requests pr ON pr.id = q.request_id
		 WHERE q.id = $1 AND q.tenant_id = $2 AND q.request_id = $3`,
		quoteID, tenantID, requestID,
	).Scan(&siteID, &supplierID, &amount)
	if errors.Is(err, pgx.ErrNoRows) {
		return PurchaseOrder{}, ErrNotFound
	}
	if err != nil {
		return PurchaseOrder{}, err
	}

	if _, err := tx.Exec(ctx, `UPDATE quotes SET is_selected = FALSE WHERE request_id = $1 AND tenant_id = $2`, requestID, tenantID); err != nil {
		return PurchaseOrder{}, err
	}
	if _, err := tx.Exec(ctx, `UPDATE quotes SET is_selected = TRUE WHERE id = $1`, quoteID); err != nil {
		return PurchaseOrder{}, err
	}
	if _, err := tx.Exec(ctx,
		`UPDATE purchase_requests SET status = 'siparis_verildi', updated_at = now() WHERE id = $1 AND tenant_id = $2`,
		requestID, tenantID,
	); err != nil {
		return PurchaseOrder{}, err
	}

	var o PurchaseOrder
	if err := tx.QueryRow(ctx,
		`INSERT INTO purchase_orders (tenant_id, site_id, request_id, supplier_id, amount, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, site_id, request_id, supplier_id, amount, status, ordered_at, delivered_at, created_by, created_at`,
		tenantID, siteID, requestID, supplierID, amount, createdBy,
	).Scan(&o.ID, &o.TenantID, &o.SiteID, &o.RequestID, &o.SupplierID, &o.Amount, &o.Status, &o.OrderedAt, &o.DeliveredAt, &o.CreatedBy, &o.CreatedAt); err != nil {
		return PurchaseOrder{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return PurchaseOrder{}, err
	}
	return o, nil
}

// --- Purchase Orders ---

func (s *Service) ListOrders(ctx context.Context, tenantID, siteID uuid.UUID) ([]PurchaseOrder, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, request_id, supplier_id, amount, status, ordered_at, delivered_at, created_by, created_at
		 FROM purchase_orders WHERE tenant_id = $1 AND site_id = $2 ORDER BY created_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []PurchaseOrder{}
	for rows.Next() {
		var o PurchaseOrder
		if err := rows.Scan(&o.ID, &o.TenantID, &o.SiteID, &o.RequestID, &o.SupplierID, &o.Amount, &o.Status, &o.OrderedAt, &o.DeliveredAt, &o.CreatedBy, &o.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, o)
	}
	return list, rows.Err()
}

func (s *Service) MarkDelivered(ctx context.Context, tenantID, orderID uuid.UUID) (PurchaseOrder, error) {
	var o PurchaseOrder
	err := s.pool.QueryRow(ctx,
		`UPDATE purchase_orders SET status = 'teslim_alindi', delivered_at = now() WHERE id = $1 AND tenant_id = $2
		 RETURNING id, tenant_id, site_id, request_id, supplier_id, amount, status, ordered_at, delivered_at, created_by, created_at`,
		orderID, tenantID,
	).Scan(&o.ID, &o.TenantID, &o.SiteID, &o.RequestID, &o.SupplierID, &o.Amount, &o.Status, &o.OrderedAt, &o.DeliveredAt, &o.CreatedBy, &o.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return PurchaseOrder{}, ErrNotFound
	}
	return o, err
}

// --- Supplier Invoices (Fatura Takibi) ---

func (s *Service) CreateInvoice(ctx context.Context, tenantID, orderID uuid.UUID, invoiceNo *string, amount float64, invoiceDate string) (SupplierInvoice, error) {
	var inv SupplierInvoice
	err := s.pool.QueryRow(ctx,
		`INSERT INTO supplier_invoices (tenant_id, order_id, invoice_no, amount, invoice_date) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, order_id, invoice_no, amount, invoice_date, is_paid, created_at`,
		tenantID, orderID, invoiceNo, amount, invoiceDate,
	).Scan(&inv.ID, &inv.TenantID, &inv.OrderID, &inv.InvoiceNo, &inv.Amount, &inv.InvoiceDate, &inv.IsPaid, &inv.CreatedAt)
	return inv, err
}

func (s *Service) ListInvoices(ctx context.Context, tenantID, orderID uuid.UUID) ([]SupplierInvoice, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, order_id, invoice_no, amount, invoice_date, is_paid, created_at
		 FROM supplier_invoices WHERE tenant_id = $1 AND order_id = $2 ORDER BY invoice_date DESC`, tenantID, orderID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []SupplierInvoice{}
	for rows.Next() {
		var inv SupplierInvoice
		if err := rows.Scan(&inv.ID, &inv.TenantID, &inv.OrderID, &inv.InvoiceNo, &inv.Amount, &inv.InvoiceDate, &inv.IsPaid, &inv.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, inv)
	}
	return list, rows.Err()
}

func (s *Service) MarkInvoicePaid(ctx context.Context, tenantID, invoiceID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx, `UPDATE supplier_invoices SET is_paid = TRUE WHERE id = $1 AND tenant_id = $2`, invoiceID, tenantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
