-- Modül 13: Güvenlik Modülü — devriye kayıtları, olay kayıtları, kamera notları,
-- tur kontrol sistemi, vardiya takibi (güvenlik personeli vardiyaları).

CREATE TYPE incident_severity AS ENUM ('dusuk', 'orta', 'yuksek', 'kritik');

-- Tur kontrol noktaları (devriye rotası üzerindeki kontrol noktaları).
CREATE TABLE patrol_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_patrol_checkpoints_site_id ON patrol_checkpoints(site_id);

-- Devriye turu: bir güvenlik görevlisinin başlattığı tur.
CREATE TABLE patrols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    guard_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    note TEXT
);
CREATE INDEX idx_patrols_site_id ON patrols(site_id);

-- Tur kontrol sistemi: bir turda hangi kontrol noktalarının ne zaman tarandığı.
CREATE TABLE patrol_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patrol_id UUID NOT NULL REFERENCES patrols(id) ON DELETE CASCADE,
    checkpoint_id UUID NOT NULL REFERENCES patrol_checkpoints(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_patrol_scans_patrol_id ON patrol_scans(patrol_id);

-- Olay kayıtları (ve kamera notları bu kayda iliştirilebilir — camera_note alanı).
CREATE TABLE security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    severity incident_severity NOT NULL DEFAULT 'dusuk',
    camera_note TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_security_incidents_site_id ON security_incidents(site_id);

-- Güvenlik vardiya takibi.
CREATE TABLE security_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    guard_id UUID REFERENCES users(id) ON DELETE SET NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_security_shifts_site_id ON security_shifts(site_id);
