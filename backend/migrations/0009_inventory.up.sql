-- Modül 10: Demirbaş ve Envanter — demirbaş kayıtları, seri no, garanti süresi,
-- zimmet işlemleri, sayım işlemleri, amortisman hesapları.

CREATE TYPE asset_status AS ENUM ('depoda', 'zimmetli', 'hurda', 'kayip');

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    serial_no TEXT,
    category TEXT,
    purchase_date DATE,
    purchase_price NUMERIC(12, 2),
    useful_life_years INTEGER, -- amortisman hesaplaması için faydalı ömür
    warranty_until DATE,
    status asset_status NOT NULL DEFAULT 'depoda',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- zimmetli olduğu personel
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assets_site_id ON assets(site_id);
CREATE INDEX idx_assets_assigned_to ON assets(assigned_to);

-- Zimmet geçmişi: bir demirbaşın kime/ne zaman zimmetlendiği/iade edildiği.
CREATE TABLE asset_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    returned_at TIMESTAMPTZ,
    note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_asset_assignments_asset_id ON asset_assignments(asset_id);

-- Sayım işlemleri: periyodik envanter sayımlarının kaydı.
CREATE TABLE asset_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    count_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_asset_counts_site_id ON asset_counts(site_id);

CREATE TABLE asset_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    count_id UUID NOT NULL REFERENCES asset_counts(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    found BOOLEAN NOT NULL DEFAULT TRUE,
    note TEXT
);
CREATE INDEX idx_asset_count_items_count_id ON asset_count_items(count_id);
