package request

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

// --- Requests ---

type CreateInput struct {
	UnitID      *uuid.UUID
	ReportedBy  *uuid.UUID
	Type        string
	Title       string
	Description *string
	Priority    string
}

func (s *Service) Create(ctx context.Context, tenantID, siteID uuid.UUID, in CreateInput, createdBy *uuid.UUID) (Request, error) {
	var r Request
	err := s.pool.QueryRow(ctx,
		`INSERT INTO requests (tenant_id, site_id, unit_id, reported_by, type, title, description, priority, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, tenant_id, site_id, unit_id, reported_by, type, title, description, priority, status, assigned_to, sla_due_at, created_by, created_at, updated_at`,
		tenantID, siteID, in.UnitID, in.ReportedBy, in.Type, in.Title, in.Description, in.Priority, createdBy,
	).Scan(&r.ID, &r.TenantID, &r.SiteID, &r.UnitID, &r.ReportedBy, &r.Type, &r.Title, &r.Description, &r.Priority, &r.Status, &r.AssignedTo, &r.SLADueAt, &r.CreatedBy, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return Request{}, err
	}

	if _, err := s.pool.Exec(ctx,
		`INSERT INTO request_status_changes (tenant_id, request_id, from_status, to_status, changed_by) VALUES ($1, $2, NULL, 'yeni', $3)`,
		tenantID, r.ID, createdBy,
	); err != nil {
		return Request{}, err
	}
	return r, nil
}

func (s *Service) List(ctx context.Context, tenantID, siteID uuid.UUID, status string) ([]Request, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, unit_id, reported_by, type, title, description, priority, status, assigned_to, sla_due_at, created_by, created_at, updated_at
		 FROM requests
		 WHERE tenant_id = $1 AND site_id = $2 AND ($3 = '' OR status::text = $3)
		 ORDER BY created_at DESC`,
		tenantID, siteID, status,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Request{}
	for rows.Next() {
		var r Request
		if err := rows.Scan(&r.ID, &r.TenantID, &r.SiteID, &r.UnitID, &r.ReportedBy, &r.Type, &r.Title, &r.Description, &r.Priority, &r.Status, &r.AssignedTo, &r.SLADueAt, &r.CreatedBy, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

func (s *Service) Get(ctx context.Context, tenantID, requestID uuid.UUID) (Request, error) {
	var r Request
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, site_id, unit_id, reported_by, type, title, description, priority, status, assigned_to, sla_due_at, created_by, created_at, updated_at
		 FROM requests WHERE id = $1 AND tenant_id = $2`, requestID, tenantID,
	).Scan(&r.ID, &r.TenantID, &r.SiteID, &r.UnitID, &r.ReportedBy, &r.Type, &r.Title, &r.Description, &r.Priority, &r.Status, &r.AssignedTo, &r.SLADueAt, &r.CreatedBy, &r.CreatedAt, &r.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Request{}, ErrNotFound
	}
	return r, err
}

// Assign (Görev atama).
func (s *Service) Assign(ctx context.Context, tenantID, requestID, assigneeID uuid.UUID, changedBy *uuid.UUID) (Request, error) {
	r, err := s.Get(ctx, tenantID, requestID)
	if err != nil {
		return Request{}, err
	}

	var updated Request
	err = s.pool.QueryRow(ctx,
		`UPDATE requests SET assigned_to = $1, status = 'atandi', updated_at = now() WHERE id = $2 AND tenant_id = $3
		 RETURNING id, tenant_id, site_id, unit_id, reported_by, type, title, description, priority, status, assigned_to, sla_due_at, created_by, created_at, updated_at`,
		assigneeID, requestID, tenantID,
	).Scan(&updated.ID, &updated.TenantID, &updated.SiteID, &updated.UnitID, &updated.ReportedBy, &updated.Type, &updated.Title, &updated.Description, &updated.Priority, &updated.Status, &updated.AssignedTo, &updated.SLADueAt, &updated.CreatedBy, &updated.CreatedAt, &updated.UpdatedAt)
	if err != nil {
		return Request{}, err
	}

	oldStatus := r.Status
	if _, err := s.pool.Exec(ctx,
		`INSERT INTO request_status_changes (tenant_id, request_id, from_status, to_status, note, changed_by) VALUES ($1, $2, $3, 'atandi', 'Görevli atandı', $4)`,
		tenantID, requestID, oldStatus, changedBy,
	); err != nil {
		return Request{}, err
	}
	return updated, nil
}

// ChangeStatus (Durum değişiklikleri).
func (s *Service) ChangeStatus(ctx context.Context, tenantID, requestID uuid.UUID, newStatus string, note *string, changedBy *uuid.UUID) (Request, error) {
	r, err := s.Get(ctx, tenantID, requestID)
	if err != nil {
		return Request{}, err
	}

	var updated Request
	err = s.pool.QueryRow(ctx,
		`UPDATE requests SET status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3
		 RETURNING id, tenant_id, site_id, unit_id, reported_by, type, title, description, priority, status, assigned_to, sla_due_at, created_by, created_at, updated_at`,
		newStatus, requestID, tenantID,
	).Scan(&updated.ID, &updated.TenantID, &updated.SiteID, &updated.UnitID, &updated.ReportedBy, &updated.Type, &updated.Title, &updated.Description, &updated.Priority, &updated.Status, &updated.AssignedTo, &updated.SLADueAt, &updated.CreatedBy, &updated.CreatedAt, &updated.UpdatedAt)
	if err != nil {
		return Request{}, err
	}

	oldStatus := r.Status
	if _, err := s.pool.Exec(ctx,
		`INSERT INTO request_status_changes (tenant_id, request_id, from_status, to_status, note, changed_by) VALUES ($1, $2, $3, $4, $5, $6)`,
		tenantID, requestID, oldStatus, newStatus, note, changedBy,
	); err != nil {
		return Request{}, err
	}
	return updated, nil
}

func (s *Service) ListStatusHistory(ctx context.Context, tenantID, requestID uuid.UUID) ([]StatusChange, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, request_id, from_status, to_status, note, changed_by, created_at
		 FROM request_status_changes WHERE tenant_id = $1 AND request_id = $2 ORDER BY created_at`, tenantID, requestID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []StatusChange{}
	for rows.Next() {
		var sc StatusChange
		if err := rows.Scan(&sc.ID, &sc.TenantID, &sc.RequestID, &sc.FromStatus, &sc.ToStatus, &sc.Note, &sc.ChangedBy, &sc.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, sc)
	}
	return list, rows.Err()
}

// --- Attachments (Dosya / fotoğraf ekleme) ---

func (s *Service) AddAttachment(ctx context.Context, tenantID, requestID uuid.UUID, fileName, fileURL string, contentType *string, uploadedBy *uuid.UUID) (Attachment, error) {
	var a Attachment
	err := s.pool.QueryRow(ctx,
		`INSERT INTO request_attachments (tenant_id, request_id, file_name, file_url, content_type, uploaded_by)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, request_id, file_name, file_url, content_type, uploaded_by, created_at`,
		tenantID, requestID, fileName, fileURL, contentType, uploadedBy,
	).Scan(&a.ID, &a.TenantID, &a.RequestID, &a.FileName, &a.FileURL, &a.ContentType, &a.UploadedBy, &a.CreatedAt)
	return a, err
}

func (s *Service) ListAttachments(ctx context.Context, tenantID, requestID uuid.UUID) ([]Attachment, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, request_id, file_name, file_url, content_type, uploaded_by, created_at
		 FROM request_attachments WHERE tenant_id = $1 AND request_id = $2 ORDER BY created_at`, tenantID, requestID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Attachment{}
	for rows.Next() {
		var a Attachment
		if err := rows.Scan(&a.ID, &a.TenantID, &a.RequestID, &a.FileName, &a.FileURL, &a.ContentType, &a.UploadedBy, &a.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}
