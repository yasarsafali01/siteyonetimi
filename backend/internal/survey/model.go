package survey

import (
	"time"

	"github.com/google/uuid"
)

type Survey struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenantId"`
	SiteID      uuid.UUID  `json:"siteId"`
	Title       string     `json:"title"`
	Description *string    `json:"description"`
	Type        string     `json:"type"`
	Status      string     `json:"status"`
	StartsAt    *time.Time `json:"startsAt"`
	EndsAt      *time.Time `json:"endsAt"`
	CreatedBy   *uuid.UUID `json:"createdBy"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type Option struct {
	ID           uuid.UUID `json:"id"`
	TenantID     uuid.UUID `json:"tenantId"`
	SurveyID     uuid.UUID `json:"surveyId"`
	OptionText   string    `json:"optionText"`
	DisplayOrder int       `json:"displayOrder"`
}

type Vote struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenantId"`
	SurveyID      uuid.UUID  `json:"surveyId"`
	OptionID      uuid.UUID  `json:"optionId"`
	UnitID        uuid.UUID  `json:"unitId"`
	VoterPersonID *uuid.UUID `json:"voterPersonId"`
	VotedAt       time.Time  `json:"votedAt"`
}

type OptionResult struct {
	OptionID   uuid.UUID `json:"optionId"`
	OptionText string    `json:"optionText"`
	VoteCount  int       `json:"voteCount"`
}
