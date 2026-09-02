package accounting

import (
	"time"

	"github.com/google/uuid"
)

type Account struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenantId"`
	SiteID    uuid.UUID `json:"siteId"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

type JournalEntry struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenantId"`
	SiteID          uuid.UUID  `json:"siteId"`
	EntryDate       time.Time  `json:"entryDate"`
	Description     string     `json:"description"`
	DebitAccountID  uuid.UUID  `json:"debitAccountId"`
	CreditAccountID uuid.UUID  `json:"creditAccountId"`
	Amount          float64    `json:"amount"`
	CreatedBy       *uuid.UUID `json:"createdBy"`
	CreatedAt       time.Time  `json:"createdAt"`
}

// TrialBalanceRow, mizan tablosundaki bir hesabın borç/alacak toplamlarını temsil eder.
type TrialBalanceRow struct {
	AccountID   uuid.UUID `json:"accountId"`
	AccountCode string    `json:"accountCode"`
	AccountName string    `json:"accountName"`
	AccountType string    `json:"accountType"`
	TotalDebit  float64   `json:"totalDebit"`
	TotalCredit float64   `json:"totalCredit"`
	Balance     float64   `json:"balance"` // TotalDebit - TotalCredit
}

// IncomeStatement, gelir tablosu özetidir.
type IncomeStatement struct {
	TotalIncome  float64 `json:"totalIncome"`
	TotalExpense float64 `json:"totalExpense"`
	NetIncome    float64 `json:"netIncome"`
}

// MonthlyIncomeExpense, gelir/gider grafiği için ay bazlı kırılımdır.
type MonthlyIncomeExpense struct {
	Period  string  `json:"period"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

// BalanceSheet, basitleştirilmiş bilanço özetidir.
type BalanceSheet struct {
	Cash             float64 `json:"cash"`        // kasa
	Bank             float64 `json:"bank"`        // banka
	Receivables      float64 `json:"receivables"` // cari alacak
	Payables         float64 `json:"payables"`    // cari borç
	TotalAssets      float64 `json:"totalAssets"`
	TotalLiabilities float64 `json:"totalLiabilities"`
	NetEquity        float64 `json:"netEquity"`
}

type Budget struct {
	ID            uuid.UUID `json:"id"`
	TenantID      uuid.UUID `json:"tenantId"`
	SiteID        uuid.UUID `json:"siteId"`
	AccountID     uuid.UUID `json:"accountId"`
	Period        string    `json:"period"`
	PlannedAmount float64   `json:"plannedAmount"`
	CreatedAt     time.Time `json:"createdAt"`
}

type BudgetComparison struct {
	Budget
	ActualAmount float64 `json:"actualAmount"`
	Variance     float64 `json:"variance"` // PlannedAmount - ActualAmount
}
