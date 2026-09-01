package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"siteyonetimi/backend/internal/config"
)

var ErrInvalidCredentials = errors.New("e-posta veya şifre hatalı")
var ErrInvalidRefreshToken = errors.New("geçersiz veya süresi dolmuş refresh token")

type Service struct {
	pool *pgxpool.Pool
	cfg  config.Config
}

func NewService(pool *pgxpool.Pool, cfg config.Config) *Service {
	return &Service{pool: pool, cfg: cfg}
}

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

// RegisterTenant yeni bir yönetim şirketi (tenant) ve o şirketin ilk süper admin kullanıcısını oluşturur.
func (s *Service) RegisterTenant(ctx context.Context, companyName, email, password, fullName string) (uuid.UUID, error) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return uuid.Nil, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer tx.Rollback(ctx)

	var tenantID uuid.UUID
	if err := tx.QueryRow(ctx,
		`INSERT INTO tenants (name) VALUES ($1) RETURNING id`, companyName,
	).Scan(&tenantID); err != nil {
		return uuid.Nil, err
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO users (tenant_id, email, password_hash, full_name, is_super_admin)
		 VALUES ($1, $2, $3, $4, TRUE)`,
		tenantID, email, string(passwordHash), fullName,
	); err != nil {
		return uuid.Nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return uuid.Nil, err
	}
	return tenantID, nil
}

func (s *Service) Login(ctx context.Context, email, password string) (TokenPair, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, email, password_hash, full_name, is_super_admin, is_active
		 FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.TenantID, &u.Email, &u.PasswordHash, &u.FullName, &u.IsSuperAdmin, &u.IsActive)
	if err != nil {
		return TokenPair{}, ErrInvalidCredentials
	}
	if !u.IsActive {
		return TokenPair{}, ErrInvalidCredentials
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return TokenPair{}, ErrInvalidCredentials
	}

	permissions, err := s.fetchPermissions(ctx, u.ID)
	if err != nil {
		return TokenPair{}, err
	}

	return s.issueTokenPair(ctx, u, permissions)
}

func (s *Service) RefreshAccessToken(ctx context.Context, refreshToken string) (TokenPair, error) {
	claims, err := ParseRefreshToken(s.cfg.JWTRefreshSecret, refreshToken)
	if err != nil {
		return TokenPair{}, ErrInvalidRefreshToken
	}

	tokenHash := hashToken(refreshToken)
	var storedUserID uuid.UUID
	err = s.pool.QueryRow(ctx,
		`SELECT user_id FROM refresh_tokens
		 WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > now()`,
		tokenHash, claims.UserID,
	).Scan(&storedUserID)
	if err != nil {
		return TokenPair{}, ErrInvalidRefreshToken
	}

	var u User
	err = s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, email, password_hash, full_name, is_super_admin, is_active
		 FROM users WHERE id = $1`, storedUserID,
	).Scan(&u.ID, &u.TenantID, &u.Email, &u.PasswordHash, &u.FullName, &u.IsSuperAdmin, &u.IsActive)
	if err != nil || !u.IsActive {
		return TokenPair{}, ErrInvalidRefreshToken
	}

	// Refresh token rotasyonu: eskisi iptal edilir, yenisi verilir.
	if _, err := s.pool.Exec(ctx,
		`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, tokenHash,
	); err != nil {
		return TokenPair{}, err
	}

	permissions, err := s.fetchPermissions(ctx, u.ID)
	if err != nil {
		return TokenPair{}, err
	}

	return s.issueTokenPair(ctx, u, permissions)
}

func (s *Service) issueTokenPair(ctx context.Context, u User, permissions []string) (TokenPair, error) {
	accessToken, err := GenerateAccessToken(s.cfg.JWTAccessSecret, s.cfg.AccessTokenTTL, u.ID, u.TenantID, u.IsSuperAdmin, permissions)
	if err != nil {
		return TokenPair{}, err
	}

	refreshToken, expiresAt, err := GenerateRefreshToken(s.cfg.JWTRefreshSecret, s.cfg.RefreshTokenTTL, u.ID)
	if err != nil {
		return TokenPair{}, err
	}

	if _, err := s.pool.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		u.ID, hashToken(refreshToken), expiresAt,
	); err != nil {
		return TokenPair{}, err
	}

	return TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func (s *Service) fetchPermissions(ctx context.Context, userID uuid.UUID) ([]string, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT DISTINCT p.code
		 FROM permissions p
		 JOIN role_permissions rp ON rp.permission_id = p.id
		 JOIN user_roles ur ON ur.role_id = rp.role_id
		 WHERE ur.user_id = $1`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []string
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}
		permissions = append(permissions, code)
	}
	return permissions, rows.Err()
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
