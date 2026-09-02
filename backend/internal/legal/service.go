package legal

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

// --- Lawyers ---

func (s *Service) CreateLawyer(ctx context.Context, tenantID uuid.UUID, fullName string, phone, email, barAssociation *string) (Lawyer, error) {
	var l Lawyer
	err := s.pool.QueryRow(ctx,
		`INSERT INTO lawyers (tenant_id, full_name, phone, email, bar_association) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, full_name, phone, email, bar_association, is_active, created_at`,
		tenantID, fullName, phone, email, barAssociation,
	).Scan(&l.ID, &l.TenantID, &l.FullName, &l.Phone, &l.Email, &l.BarAssociation, &l.IsActive, &l.CreatedAt)
	return l, err
}

func (s *Service) ListLawyers(ctx context.Context, tenantID uuid.UUID) ([]Lawyer, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, full_name, phone, email, bar_association, is_active, created_at
		 FROM lawyers WHERE tenant_id = $1 ORDER BY full_name`, tenantID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Lawyer{}
	for rows.Next() {
		var l Lawyer
		if err := rows.Scan(&l.ID, &l.TenantID, &l.FullName, &l.Phone, &l.Email, &l.BarAssociation, &l.IsActive, &l.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, l)
	}
	return list, rows.Err()
}

// --- Cases ---

const caseColumns = `id, tenant_id, site_id, unit_id, person_id, lawyer_id, case_type, case_no, title, description, status, amount, opened_at, closed_at, created_by, created_at`

func scanCase(row pgx.Row) (Case, error) {
	var c Case
	err := row.Scan(&c.ID, &c.TenantID, &c.SiteID, &c.UnitID, &c.PersonID, &c.LawyerID, &c.CaseType, &c.CaseNo, &c.Title, &c.Description, &c.Status, &c.Amount, &c.OpenedAt, &c.ClosedAt, &c.CreatedBy, &c.CreatedAt)
	return c, err
}

func (s *Service) CreateCase(ctx context.Context, tenantID, siteID uuid.UUID, unitID, personID, lawyerID *uuid.UUID, caseType string, caseNo *string, title string, description *string, amount *float64, createdBy *uuid.UUID) (Case, error) {
	return scanCase(s.pool.QueryRow(ctx,
		`INSERT INTO legal_cases (tenant_id, site_id, unit_id, person_id, lawyer_id, case_type, case_no, title, description, amount, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 RETURNING `+caseColumns,
		tenantID, siteID, unitID, personID, lawyerID, caseType, caseNo, title, description, amount, createdBy,
	))
}

func (s *Service) ListCases(ctx context.Context, tenantID, siteID uuid.UUID) ([]Case, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+caseColumns+` FROM legal_cases WHERE tenant_id = $1 AND site_id = $2 ORDER BY opened_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Case{}
	for rows.Next() {
		cs, err := scanCase(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, cs)
	}
	return list, rows.Err()
}

func (s *Service) SetCaseStatus(ctx context.Context, tenantID, caseID uuid.UUID, status string) (Case, error) {
	query := `UPDATE legal_cases SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING ` + caseColumns
	if status == "kapandi" {
		query = `UPDATE legal_cases SET status = $1, closed_at = CURRENT_DATE WHERE id = $2 AND tenant_id = $3 RETURNING ` + caseColumns
	}
	cs, err := scanCase(s.pool.QueryRow(ctx, query, status, caseID, tenantID))
	if errors.Is(err, pgx.ErrNoRows) {
		return Case{}, ErrNotFound
	}
	return cs, err
}

// --- Documents ---

func (s *Service) AddDocument(ctx context.Context, tenantID, caseID uuid.UUID, title, fileURL string, uploadedBy *uuid.UUID) (Document, error) {
	var d Document
	err := s.pool.QueryRow(ctx,
		`INSERT INTO legal_documents (tenant_id, legal_case_id, title, file_url, uploaded_by) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, legal_case_id, title, file_url, uploaded_by, created_at`,
		tenantID, caseID, title, fileURL, uploadedBy,
	).Scan(&d.ID, &d.TenantID, &d.LegalCaseID, &d.Title, &d.FileURL, &d.UploadedBy, &d.CreatedAt)
	return d, err
}

func (s *Service) ListDocuments(ctx context.Context, tenantID, caseID uuid.UUID) ([]Document, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, legal_case_id, title, file_url, uploaded_by, created_at
		 FROM legal_documents WHERE tenant_id = $1 AND legal_case_id = $2 ORDER BY created_at DESC`, tenantID, caseID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Document{}
	for rows.Next() {
		var d Document
		if err := rows.Scan(&d.ID, &d.TenantID, &d.LegalCaseID, &d.Title, &d.FileURL, &d.UploadedBy, &d.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}
