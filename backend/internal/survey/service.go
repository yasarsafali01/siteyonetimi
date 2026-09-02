package survey

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("kayıt bulunamadı")
var ErrNotActive = errors.New("anket aktif değil")
var ErrAlreadyVoted = errors.New("bu birim bu ankette zaten oy kullandı")

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

const surveyColumns = `id, tenant_id, site_id, title, description, type, status, starts_at, ends_at, created_by, created_at`

func scanSurvey(row pgx.Row) (Survey, error) {
	var s Survey
	err := row.Scan(&s.ID, &s.TenantID, &s.SiteID, &s.Title, &s.Description, &s.Type, &s.Status, &s.StartsAt, &s.EndsAt, &s.CreatedBy, &s.CreatedAt)
	return s, err
}

// CreateSurvey anketi ve seçeneklerini tek işlemde oluşturur.
func (s *Service) CreateSurvey(ctx context.Context, tenantID, siteID uuid.UUID, title string, description *string, surveyType string, optionTexts []string, createdBy *uuid.UUID) (Survey, []Option, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Survey{}, nil, err
	}
	defer tx.Rollback(ctx)

	sv, err := scanSurvey(tx.QueryRow(ctx,
		`INSERT INTO surveys (tenant_id, site_id, title, description, type, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING `+surveyColumns,
		tenantID, siteID, title, description, surveyType, createdBy,
	))
	if err != nil {
		return Survey{}, nil, err
	}

	options := make([]Option, 0, len(optionTexts))
	for i, text := range optionTexts {
		var o Option
		err := tx.QueryRow(ctx,
			`INSERT INTO survey_options (tenant_id, survey_id, option_text, display_order) VALUES ($1, $2, $3, $4)
			 RETURNING id, tenant_id, survey_id, option_text, display_order`,
			tenantID, sv.ID, text, i,
		).Scan(&o.ID, &o.TenantID, &o.SurveyID, &o.OptionText, &o.DisplayOrder)
		if err != nil {
			return Survey{}, nil, err
		}
		options = append(options, o)
	}

	if err := tx.Commit(ctx); err != nil {
		return Survey{}, nil, err
	}
	return sv, options, nil
}

func (s *Service) ListSurveys(ctx context.Context, tenantID, siteID uuid.UUID) ([]Survey, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+surveyColumns+` FROM surveys WHERE tenant_id = $1 AND site_id = $2 ORDER BY created_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Survey{}
	for rows.Next() {
		sv, err := scanSurvey(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, sv)
	}
	return list, rows.Err()
}

func (s *Service) ListOptions(ctx context.Context, tenantID, surveyID uuid.UUID) ([]Option, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, survey_id, option_text, display_order FROM survey_options
		 WHERE tenant_id = $1 AND survey_id = $2 ORDER BY display_order`, tenantID, surveyID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Option{}
	for rows.Next() {
		var o Option
		if err := rows.Scan(&o.ID, &o.TenantID, &o.SurveyID, &o.OptionText, &o.DisplayOrder); err != nil {
			return nil, err
		}
		list = append(list, o)
	}
	return list, rows.Err()
}

func (s *Service) SetStatus(ctx context.Context, tenantID, surveyID uuid.UUID, status string) (Survey, error) {
	sv, err := scanSurvey(s.pool.QueryRow(ctx,
		`UPDATE surveys SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING `+surveyColumns,
		status, surveyID, tenantID,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return Survey{}, ErrNotFound
	}
	return sv, err
}

// Vote bir birimin bir ankette oy kullanmasını sağlar; anket "aktif" değilse veya
// birim daha önce oy kullandıysa reddedilir.
func (s *Service) Vote(ctx context.Context, tenantID, surveyID, optionID, unitID uuid.UUID, voterPersonID *uuid.UUID) (Vote, error) {
	var status string
	err := s.pool.QueryRow(ctx, `SELECT status FROM surveys WHERE id = $1 AND tenant_id = $2`, surveyID, tenantID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return Vote{}, ErrNotFound
	}
	if err != nil {
		return Vote{}, err
	}
	if status != "aktif" {
		return Vote{}, ErrNotActive
	}

	var v Vote
	err = s.pool.QueryRow(ctx,
		`INSERT INTO survey_votes (tenant_id, survey_id, option_id, unit_id, voter_person_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, survey_id, option_id, unit_id, voter_person_id, voted_at`,
		tenantID, surveyID, optionID, unitID, voterPersonID,
	).Scan(&v.ID, &v.TenantID, &v.SurveyID, &v.OptionID, &v.UnitID, &v.VoterPersonID, &v.VotedAt)
	if err != nil {
		if isUniqueViolation(err) {
			return Vote{}, ErrAlreadyVoted
		}
		return Vote{}, err
	}
	return v, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func (s *Service) Results(ctx context.Context, tenantID, surveyID uuid.UUID) ([]OptionResult, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT o.id, o.option_text, count(v.id)
		 FROM survey_options o
		 LEFT JOIN survey_votes v ON v.option_id = o.id AND v.tenant_id = o.tenant_id
		 WHERE o.tenant_id = $1 AND o.survey_id = $2
		 GROUP BY o.id, o.option_text, o.display_order
		 ORDER BY o.display_order`, tenantID, surveyID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []OptionResult{}
	for rows.Next() {
		var r OptionResult
		if err := rows.Scan(&r.OptionID, &r.OptionText, &r.VoteCount); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}
