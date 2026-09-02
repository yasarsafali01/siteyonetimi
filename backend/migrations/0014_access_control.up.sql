-- Modül 15: Geçiş Kontrol Sistemi — QR/NFC/kartlı geçiş, plaka tanıma, bariyer/turnike
-- entegrasyonu (gerçek donanım SDK entegrasyonu kapsam dışı, modül 26'ya not düşülür;
-- burada geçiş noktası + kimlik bilgisi + tarama kaydı akışı modelleniyor).

CREATE TYPE access_credential_type AS ENUM ('qr', 'nfc', 'kart', 'plaka');
CREATE TYPE access_point_type AS ENUM ('bariyer', 'turnike', 'kapi');

-- Geçiş noktaları (bariyer, turnike, kapı).
CREATE TABLE access_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type access_point_type NOT NULL,
    location TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_access_points_site_id ON access_points(site_id);

-- Kayıtlı geçiş kimlik bilgileri (QR kod, NFC id, kart no, plaka).
CREATE TABLE access_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    type access_credential_type NOT NULL,
    credential_value TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, type, credential_value)
);
CREATE INDEX idx_access_credentials_site_id ON access_credentials(site_id);

-- Geçiş tarama kayıtları: bariyer/turnike/kapının açılıp açılmadığı (granted) burada tutulur.
CREATE TABLE access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    access_point_id UUID NOT NULL REFERENCES access_points(id) ON DELETE CASCADE,
    credential_id UUID REFERENCES access_credentials(id) ON DELETE SET NULL,
    method access_credential_type NOT NULL,
    credential_value_snapshot TEXT NOT NULL,
    granted BOOLEAN NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_access_logs_site_id ON access_logs(site_id);
CREATE INDEX idx_access_logs_access_point_id ON access_logs(access_point_id);
