package reporting

import "github.com/google/uuid"

type Dashboard struct {
	TotalUnits           int     `json:"totalUnits"`
	TotalOutstandingDebt float64 `json:"totalOutstandingDebt"`
	ChargedThisMonth     float64 `json:"chargedThisMonth"`
	CollectedThisMonth   float64 `json:"collectedThisMonth"`
	OpenRequests         int     `json:"openRequests"`
	ActiveWorkOrders     int     `json:"activeWorkOrders"`
	PendingReservations  int     `json:"pendingReservations"`
}

type CollectionRatePeriod struct {
	Period    string  `json:"period"`
	Charged   float64 `json:"charged"`
	Collected float64 `json:"collected"`
	RatePct   float64 `json:"ratePct"`
}

type Debtor struct {
	UnitID          uuid.UUID `json:"unitId"`
	UnitNumber      string    `json:"unitNumber"`
	BlockName       string    `json:"blockName"`
	TotalCharged    float64   `json:"totalCharged"`
	TotalPaid       float64   `json:"totalPaid"`
	RemainingAmount float64   `json:"remainingAmount"`
}
