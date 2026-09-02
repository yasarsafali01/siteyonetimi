package announcement

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) CreateAnnouncement(ctx context.Context, tenantID, siteID uuid.UUID, title, content, category string, targetBlockID *uuid.UUID, channels []string, publishedBy *uuid.UUID) (Announcement, error) {
	if len(channels) == 0 {
		channels = []string{"site_ici"}
	}
	var a Announcement
	err := s.pool.QueryRow(ctx,
		`INSERT INTO announcements (tenant_id, site_id, title, content, category, target_block_id, channels, published_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, tenant_id, site_id, title, content, category, target_block_id, channels, published_by, published_at, created_at`,
		tenantID, siteID, title, content, category, targetBlockID, channels, publishedBy,
	).Scan(&a.ID, &a.TenantID, &a.SiteID, &a.Title, &a.Content, &a.Category, &a.TargetBlockID, &a.Channels, &a.PublishedBy, &a.PublishedAt, &a.CreatedAt)
	return a, err
}

func (s *Service) ListAnnouncements(ctx context.Context, tenantID, siteID uuid.UUID) ([]Announcement, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, title, content, category, target_block_id, channels, published_by, published_at, created_at
		 FROM announcements WHERE tenant_id = $1 AND site_id = $2 ORDER BY published_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Announcement{}
	for rows.Next() {
		var a Announcement
		if err := rows.Scan(&a.ID, &a.TenantID, &a.SiteID, &a.Title, &a.Content, &a.Category, &a.TargetBlockID, &a.Channels, &a.PublishedBy, &a.PublishedAt, &a.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}
