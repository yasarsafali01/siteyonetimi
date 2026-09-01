-- Modül 4: Finans ve Aidat Yönetimi (online ödeme altyapısı hariç — modül 5).
-- Borçlandırma (aidat/ek aidat/özel gider/gecikme faizi-tazminatı) ve manuel tahsilat kaydı.

CREATE TYPE charge_type AS ENUM ('aidat', 'ek_aidat', 'ozel_gider', 'gecikme_faizi', 'gecikme_tazminati');
CREATE TYPE payment_method AS ENUM ('nakit', 'banka_havalesi', 'diger');

CREATE TABLE charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    type charge_type NOT NULL,
    period TEXT, -- 'YYYY-MM', aidat için dönem; diğer tipler için NULL olabilir
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    due_date DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_charges_unit_id ON charges(unit_id);
CREATE INDEX idx_charges_site_id ON charges(site_id);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    charge_id UUID NOT NULL REFERENCES charges(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    method payment_method NOT NULL DEFAULT 'nakit',
    paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_charge_id ON payments(charge_id);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
