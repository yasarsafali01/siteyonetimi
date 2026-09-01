package accounting

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

// --- Accounts ---

func (s *Service) CreateAccount(ctx context.Context, tenantID, siteID uuid.UUID, code, name, accType string) (Account, error) {
	var a Account
	err := s.pool.QueryRow(ctx,
		`INSERT INTO accounts (tenant_id, site_id, code, name, type) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, site_id, code, name, type, is_active, created_at`,
		tenantID, siteID, code, name, accType,
	).Scan(&a.ID, &a.TenantID, &a.SiteID, &a.Code, &a.Name, &a.Type, &a.IsActive, &a.CreatedAt)
	return a, err
}

func (s *Service) ListAccounts(ctx context.Context, tenantID, siteID uuid.UUID) ([]Account, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, code, name, type, is_active, created_at
		 FROM accounts WHERE tenant_id = $1 AND site_id = $2 ORDER BY code`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Account{}
	for rows.Next() {
		var a Account
		if err := rows.Scan(&a.ID, &a.TenantID, &a.SiteID, &a.Code, &a.Name, &a.Type, &a.IsActive, &a.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}

func (s *Service) DeactivateAccount(ctx context.Context, tenantID, accountID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE accounts SET is_active = FALSE WHERE id = $1 AND tenant_id = $2`, accountID, tenantID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Journal Entries (Muhasebe Fişleri) ---

func (s *Service) CreateJournalEntry(ctx context.Context, tenantID, siteID uuid.UUID, entryDate string, description string, debitAccountID, creditAccountID uuid.UUID, amount float64, createdBy *uuid.UUID) (JournalEntry, error) {
	var e JournalEntry
	err := s.pool.QueryRow(ctx,
		`INSERT INTO journal_entries (tenant_id, site_id, entry_date, description, debit_account_id, credit_account_id, amount, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, tenant_id, site_id, entry_date, description, debit_account_id, credit_account_id, amount, created_by, created_at`,
		tenantID, siteID, entryDate, description, debitAccountID, creditAccountID, amount, createdBy,
	).Scan(&e.ID, &e.TenantID, &e.SiteID, &e.EntryDate, &e.Description, &e.DebitAccountID, &e.CreditAccountID, &e.Amount, &e.CreatedBy, &e.CreatedAt)
	return e, err
}

func (s *Service) ListJournalEntries(ctx context.Context, tenantID, siteID uuid.UUID) ([]JournalEntry, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, site_id, entry_date, description, debit_account_id, credit_account_id, amount, created_by, created_at
		 FROM journal_entries WHERE tenant_id = $1 AND site_id = $2 ORDER BY entry_date DESC, created_at DESC`, tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []JournalEntry{}
	for rows.Next() {
		var e JournalEntry
		if err := rows.Scan(&e.ID, &e.TenantID, &e.SiteID, &e.EntryDate, &e.Description, &e.DebitAccountID, &e.CreditAccountID, &e.Amount, &e.CreatedBy, &e.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

func (s *Service) DeleteJournalEntry(ctx context.Context, tenantID, entryID uuid.UUID) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM journal_entries WHERE id = $1 AND tenant_id = $2`, entryID, tenantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Reports ---

// TrialBalance (Mizan): her hesabın toplam borç/alacak/bakiyesi.
func (s *Service) TrialBalance(ctx context.Context, tenantID, siteID uuid.UUID) ([]TrialBalanceRow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT a.id, a.code, a.name, a.type,
		        COALESCE((SELECT SUM(amount) FROM journal_entries WHERE debit_account_id = a.id), 0) AS total_debit,
		        COALESCE((SELECT SUM(amount) FROM journal_entries WHERE credit_account_id = a.id), 0) AS total_credit
		 FROM accounts a
		 WHERE a.tenant_id = $1 AND a.site_id = $2 AND a.is_active = TRUE
		 ORDER BY a.code`,
		tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []TrialBalanceRow{}
	for rows.Next() {
		var r TrialBalanceRow
		if err := rows.Scan(&r.AccountID, &r.AccountCode, &r.AccountName, &r.AccountType, &r.TotalDebit, &r.TotalCredit); err != nil {
			return nil, err
		}
		r.Balance = r.TotalDebit - r.TotalCredit
		list = append(list, r)
	}
	return list, rows.Err()
}

// IncomeStatement (Gelir Tablosu).
func (s *Service) IncomeStatement(ctx context.Context, tenantID, siteID uuid.UUID) (IncomeStatement, error) {
	var stmt IncomeStatement
	err := s.pool.QueryRow(ctx,
		`SELECT
		   COALESCE((
		     SELECT SUM(je.amount) FROM journal_entries je JOIN accounts a ON a.id = je.credit_account_id
		     WHERE a.tenant_id = $1 AND a.site_id = $2 AND a.type = 'gelir'
		   ), 0) - COALESCE((
		     SELECT SUM(je.amount) FROM journal_entries je JOIN accounts a ON a.id = je.debit_account_id
		     WHERE a.tenant_id = $1 AND a.site_id = $2 AND a.type = 'gelir'
		   ), 0) AS total_income,
		   COALESCE((
		     SELECT SUM(je.amount) FROM journal_entries je JOIN accounts a ON a.id = je.debit_account_id
		     WHERE a.tenant_id = $1 AND a.site_id = $2 AND a.type = 'gider'
		   ), 0) - COALESCE((
		     SELECT SUM(je.amount) FROM journal_entries je JOIN accounts a ON a.id = je.credit_account_id
		     WHERE a.tenant_id = $1 AND a.site_id = $2 AND a.type = 'gider'
		   ), 0) AS total_expense`,
		tenantID, siteID,
	).Scan(&stmt.TotalIncome, &stmt.TotalExpense)
	if err != nil {
		return stmt, err
	}
	stmt.NetIncome = stmt.TotalIncome - stmt.TotalExpense
	return stmt, nil
}

// BalanceSheet (Bilanço) — basitleştirilmiş.
func (s *Service) BalanceSheet(ctx context.Context, tenantID, siteID uuid.UUID) (BalanceSheet, error) {
	balanceFor := func(accType string, creditNatured bool) (float64, error) {
		var debit, credit float64
		err := s.pool.QueryRow(ctx,
			`SELECT
			   COALESCE((SELECT SUM(je.amount) FROM journal_entries je JOIN accounts a ON a.id = je.debit_account_id WHERE a.tenant_id = $1 AND a.site_id = $2 AND a.type = $3), 0),
			   COALESCE((SELECT SUM(je.amount) FROM journal_entries je JOIN accounts a ON a.id = je.credit_account_id WHERE a.tenant_id = $1 AND a.site_id = $2 AND a.type = $3), 0)`,
			tenantID, siteID, accType,
		).Scan(&debit, &credit)
		if err != nil {
			return 0, err
		}
		if creditNatured {
			return credit - debit, nil
		}
		return debit - credit, nil
	}

	var sheet BalanceSheet
	var err error
	if sheet.Cash, err = balanceFor("kasa", false); err != nil {
		return sheet, err
	}
	if sheet.Bank, err = balanceFor("banka", false); err != nil {
		return sheet, err
	}
	if sheet.Receivables, err = balanceFor("cari_alacak", false); err != nil {
		return sheet, err
	}
	if sheet.Payables, err = balanceFor("cari_borc", true); err != nil {
		return sheet, err
	}

	sheet.TotalAssets = sheet.Cash + sheet.Bank + sheet.Receivables
	sheet.TotalLiabilities = sheet.Payables
	sheet.NetEquity = sheet.TotalAssets - sheet.TotalLiabilities
	return sheet, nil
}

// --- Budgets ---

func (s *Service) CreateBudget(ctx context.Context, tenantID, siteID, accountID uuid.UUID, period string, plannedAmount float64) (Budget, error) {
	var b Budget
	err := s.pool.QueryRow(ctx,
		`INSERT INTO budgets (tenant_id, site_id, account_id, period, planned_amount) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, site_id, account_id, period, planned_amount, created_at`,
		tenantID, siteID, accountID, period, plannedAmount,
	).Scan(&b.ID, &b.TenantID, &b.SiteID, &b.AccountID, &b.Period, &b.PlannedAmount, &b.CreatedAt)
	return b, err
}

func (s *Service) ListBudgetComparison(ctx context.Context, tenantID, siteID uuid.UUID, period string) ([]BudgetComparison, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT b.id, b.tenant_id, b.site_id, b.account_id, b.period, b.planned_amount, b.created_at, a.type
		 FROM budgets b JOIN accounts a ON a.id = b.account_id
		 WHERE b.tenant_id = $1 AND b.site_id = $2 AND b.period = $3
		 ORDER BY a.code`,
		tenantID, siteID, period,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type row struct {
		b   Budget
		typ string
	}
	var raw []row
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.b.ID, &r.b.TenantID, &r.b.SiteID, &r.b.AccountID, &r.b.Period, &r.b.PlannedAmount, &r.b.CreatedAt, &r.typ); err != nil {
			return nil, err
		}
		raw = append(raw, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	list := make([]BudgetComparison, 0, len(raw))
	for _, r := range raw {
		var debit, credit float64
		err := s.pool.QueryRow(ctx,
			`SELECT
			   COALESCE((SELECT SUM(amount) FROM journal_entries WHERE debit_account_id = $1 AND to_char(entry_date, 'YYYY-MM') = $2), 0),
			   COALESCE((SELECT SUM(amount) FROM journal_entries WHERE credit_account_id = $1 AND to_char(entry_date, 'YYYY-MM') = $2), 0)`,
			r.b.AccountID, period,
		).Scan(&debit, &credit)
		if err != nil {
			return nil, err
		}
		actual := debit - credit
		if r.typ == "gelir" {
			actual = credit - debit
		}
		list = append(list, BudgetComparison{
			Budget:       r.b,
			ActualAmount: actual,
			Variance:     r.b.PlannedAmount - actual,
		})
	}
	return list, nil
}
