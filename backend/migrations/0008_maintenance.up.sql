-- Modül 9: Bakım ve İş Emri Yönetimi — tesis varlıkları (asansör/jeneratör/havuz/yangın sistemi),
-- periyodik bakım planları, iş emirleri, bakım geçmişi.

CREATE TYPE facility_type AS ENUM ('asansor', 'jenerator', 'havuz', 'yangin_sistemi', 'diger');
CREATE TYPE work_order_status AS ENUM ('planlandi', 'devam_ediyor', 'tamamlandi', 'iptal');

CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    type facility_type NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_facilities_site_id ON facilities(site_id);

-- Periyodik bakım planı: bir tesis varlığı için tekrar sıklığı.
CREATE TABLE maintenance_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    frequency_days INTEGER NOT NULL CHECK (frequency_days > 0),
    next_due_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_maintenance_plans_facility_id ON maintenance_plans(facility_id);

-- İş emri: planlı bakımdan ya da doğrudan (plansız) oluşturulabilir.
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES maintenance_plans(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status work_order_status NOT NULL DEFAULT 'planlandi',
    scheduled_date DATE,
    completed_at TIMESTAMPTZ,
    completion_note TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_work_orders_site_id ON work_orders(site_id);
CREATE INDEX idx_work_orders_facility_id ON work_orders(facility_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
