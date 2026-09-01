-- Modül 7: Sayaç Yönetimi — elektrik/su/doğalgaz/kalorimetre sayaçları, endeks girişleri.

-- Sayaç tüketim faturalarının Finans modülündeki borç (charge) sistemine yazılabilmesi için.
ALTER TYPE charge_type ADD VALUE IF NOT EXISTS 'sayac_tuketimi';

CREATE TYPE meter_type AS ENUM ('elektrik', 'su', 'dogalgaz', 'kalorimetre');

CREATE TABLE meters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE, -- NULL ise ortak alan/site geneli sayaç
    type meter_type NOT NULL,
    serial_no TEXT,
    unit_price NUMERIC(10, 4) NOT NULL DEFAULT 0, -- tüketim birimi başına fiyat
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meters_site_id ON meters(site_id);
CREATE INDEX idx_meters_unit_id ON meters(unit_id);

CREATE TABLE meter_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
    value NUMERIC(14, 3) NOT NULL, -- kümülatif endeks değeri
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meter_readings_meter_id ON meter_readings(meter_id);
