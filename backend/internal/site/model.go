package site

import (
	"time"

	"github.com/google/uuid"
)

type Site struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	Name      string    `json:"name"`
	Address   *string   `json:"address"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Block struct {
	ID         uuid.UUID `json:"id"`
	TenantID   uuid.UUID `json:"tenantId"`
	SiteID     uuid.UUID `json:"siteId"`
	Name       string    `json:"name"`
	FloorCount *int      `json:"floorCount"`
	IsActive   bool      `json:"isActive"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type Unit struct {
	ID              uuid.UUID `json:"id"`
	TenantID        uuid.UUID `json:"tenantId"`
	SiteID          uuid.UUID `json:"siteId"`
	BlockID         uuid.UUID `json:"blockId"`
	UnitNumber      string    `json:"unitNumber"`
	Floor           *int      `json:"floor"`
	Type            string    `json:"type"` // daire | dukkan | ofis
	GrossSqm        *float64  `json:"grossSqm"`
	NetSqm          *float64  `json:"netSqm"`
	LandShare       *float64  `json:"landShare"`
	DuesCoefficient float64   `json:"duesCoefficient"`
	TitleDeedNo     *string   `json:"titleDeedNo"`
	TitleDeedType   *string   `json:"titleDeedType"`
	IsActive        bool      `json:"isActive"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// Manager, bir siteye atanmış yönetici kullanıcının site listesinde göstermeye
// yetecek özet bilgisidir.
type Manager struct {
	UserID   uuid.UUID `json:"userId"`
	Email    string    `json:"email"`
	FullName string    `json:"fullName"`
}

type CommonArea struct {
	ID          uuid.UUID `json:"id"`
	TenantID    uuid.UUID `json:"tenantId"`
	SiteID      uuid.UUID `json:"siteId"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	AreaSqm     *float64  `json:"areaSqm"`
	IsActive    bool      `json:"isActive"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
