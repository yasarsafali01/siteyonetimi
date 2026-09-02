package document

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("kayıt bulunamadı")

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

const selectColumns = `id, tenant_id, site_id, category, title, description, file_url, valid_until, uploaded_by, created_at`

func (s *Service) CreateDocument(ctx context.Context, tenantID, siteID uuid.UUID, category, title string, description *string, fileURL string, validUntil *string, uploadedBy *uuid.UUID) (Document, error) {
	var d Document
	err := s.pool.QueryRow(ctx,
		`INSERT INTO documents (tenant_id, site_id, category, title, description, file_url, valid_until, uploaded_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING `+selectColumns,
		tenantID, siteID, category, title, description, fileURL, validUntil, uploadedBy,
	).Scan(&d.ID, &d.TenantID, &d.SiteID, &d.Category, &d.Title, &d.Description, &d.FileURL, &d.ValidUntil, &d.UploadedBy, &d.CreatedAt)
	return d, err
}

func (s *Service) ListDocuments(ctx context.Context, tenantID, siteID uuid.UUID, category string) ([]Document, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+selectColumns+` FROM documents
		 WHERE tenant_id = $1 AND site_id = $2 AND ($3 = '' OR category = $3::document_category)
		 ORDER BY created_at DESC`, tenantID, siteID, category,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Document{}
	for rows.Next() {
		var d Document
		if err := rows.Scan(&d.ID, &d.TenantID, &d.SiteID, &d.Category, &d.Title, &d.Description, &d.FileURL, &d.ValidUntil, &d.UploadedBy, &d.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

func (s *Service) DeleteDocument(ctx context.Context, tenantID, documentID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM documents WHERE id = $1 AND tenant_id = $2`, documentID, tenantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
