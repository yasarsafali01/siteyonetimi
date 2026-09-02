package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AccessClaims struct {
	UserID       uuid.UUID  `json:"uid"`
	TenantID     uuid.UUID  `json:"tid"`
	IsSuperAdmin bool       `json:"sa"`
	Permissions  []string   `json:"perms"`
	UserType     string     `json:"utype"`
	PersonID     *uuid.UUID `json:"pid,omitempty"`
	jwt.RegisteredClaims
}

type RefreshClaims struct {
	UserID uuid.UUID `json:"uid"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(secret string, ttl time.Duration, userID, tenantID uuid.UUID, isSuperAdmin bool, permissions []string, userType string, personID *uuid.UUID) (string, error) {
	claims := AccessClaims{
		UserID:       userID,
		TenantID:     tenantID,
		IsSuperAdmin: isSuperAdmin,
		Permissions:  permissions,
		UserType:     userType,
		PersonID:     personID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseAccessToken(secret, tokenString string) (*AccessClaims, error) {
	claims := &AccessClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("beklenmeyen imzalama yöntemi: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("geçersiz access token: %w", err)
	}
	return claims, nil
}

func GenerateRefreshToken(secret string, ttl time.Duration, userID uuid.UUID) (string, time.Time, error) {
	expiresAt := time.Now().Add(ttl)
	claims := RefreshClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        uuid.NewString(),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	return signed, expiresAt, err
}

func ParseRefreshToken(secret, tokenString string) (*RefreshClaims, error) {
	claims := &RefreshClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("beklenmeyen imzalama yöntemi: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("geçersiz refresh token: %w", err)
	}
	return claims, nil
}
