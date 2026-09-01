-- Modül 6: Muhasebe Yönetimi — hesap planı (kasa/banka/gelir/gider/cari),
-- çift taraflı muhasebe fişleri, bütçe planlama.

CREATE TYPE account_type AS ENUM ('kasa', 'banka', 'gelir', 'gider', 'cari_alacak', 'cari_borc', 'diger');

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type account_type NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (site_id, code)
);
CREATE INDEX idx_accounts_site_id ON accounts(site_id);

-- Muhasebe fişi: basitleştirilmiş çift taraflı kayıt — her fiş tek bir borç/alacak hesap çiftine sahiptir.
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    debit_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    credit_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_journal_entries_site_id ON journal_entries(site_id);
CREATE INDEX idx_journal_entries_debit ON journal_entries(debit_account_id);
CREATE INDEX idx_journal_entries_credit ON journal_entries(credit_account_id);

CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    period TEXT NOT NULL, -- 'YYYY-MM' ya da 'YYYY'
    planned_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, period)
);
CREATE INDEX idx_budgets_site_id ON budgets(site_id);
