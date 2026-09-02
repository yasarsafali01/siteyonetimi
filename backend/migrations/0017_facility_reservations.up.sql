-- Modül 18: Sosyal Tesis Rezervasyonları — havuz, spor salonu, kort, toplantı salonu,
-- misafir dairesi, barbekü alanı gibi ortak alanların (common_areas, modül 2) rezervasyonu
-- ve onay mekanizması.

CREATE TYPE facility_reservation_status AS ENUM ('bekliyor', 'onaylandi', 'reddedildi', 'iptal', 'tamamlandi');

CREATE TABLE facility_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    common_area_id UUID NOT NULL REFERENCES common_areas(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    reserved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status facility_reservation_status NOT NULL DEFAULT 'bekliyor',
    note TEXT,
    decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_facility_reservations_site_id ON facility_reservations(site_id);
CREATE INDEX idx_facility_reservations_common_area_id ON facility_reservations(common_area_id);
