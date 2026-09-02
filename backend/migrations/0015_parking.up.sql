-- Modül 16: Otopark Yönetimi — park alanları, araç kayıtları, misafir araçları,
-- park rezervasyonu, plaka sorgulama.

CREATE TYPE parking_spot_type AS ENUM ('sakin', 'misafir', 'engelli');
CREATE TYPE parking_owner_type AS ENUM ('sakin', 'misafir');
CREATE TYPE parking_reservation_status AS ENUM ('aktif', 'iptal', 'tamamlandi');

-- Park alanları.
CREATE TABLE parking_spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    spot_number TEXT NOT NULL,
    spot_type parking_spot_type NOT NULL DEFAULT 'sakin',
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (site_id, spot_number)
);
CREATE INDEX idx_parking_spots_site_id ON parking_spots(site_id);

-- Araç kayıtları (sakin ve misafir araçları; plaka sorgulama bu tablo üzerinden yapılır).
CREATE TABLE parking_vehicle_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    spot_id UUID REFERENCES parking_spots(id) ON DELETE SET NULL,
    plate TEXT NOT NULL,
    owner_type parking_owner_type NOT NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    exited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_parking_vehicle_records_site_id ON parking_vehicle_records(site_id);
CREATE INDEX idx_parking_vehicle_records_plate ON parking_vehicle_records(plate);

-- Park rezervasyonları.
CREATE TABLE parking_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    spot_id UUID NOT NULL REFERENCES parking_spots(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    reserved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status parking_reservation_status NOT NULL DEFAULT 'aktif',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_parking_reservations_site_id ON parking_reservations(site_id);
CREATE INDEX idx_parking_reservations_spot_id ON parking_reservations(spot_id);
