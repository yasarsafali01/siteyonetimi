-- Modül 17: Kargo Yönetimi — kargo kabul, teslim işlemleri, barkod okutma, bildirim gönderimi
-- (gerçek SMS/push gönderimi kapsam dışı — modül 19/26'ya not düşülür; burada notified_at
-- alanı "sakine bildirim gönderildi" işaretini tutar).

CREATE TYPE cargo_status AS ENUM ('teslim_alindi', 'sakine_teslim_edildi', 'iade');

CREATE TABLE cargo_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    recipient_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    courier_company TEXT,
    tracking_no TEXT,
    description TEXT,
    status cargo_status NOT NULL DEFAULT 'teslim_alindi',
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    delivered_at TIMESTAMPTZ,
    delivered_to TEXT,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cargo_deliveries_site_id ON cargo_deliveries(site_id);
CREATE INDEX idx_cargo_deliveries_tracking_no ON cargo_deliveries(tracking_no);
