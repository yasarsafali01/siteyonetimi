-- Modül 2: Site, Blok ve Daire Yönetimi — bloklar, bağımsız bölümler (daire/dükkan/ofis), ortak alanlar.

CREATE TYPE unit_type AS ENUM ('daire', 'dukkan', 'ofis');

CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor_count INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (site_id, name)
);
CREATE INDEX idx_blocks_site_id ON blocks(site_id);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    floor INTEGER,
    type unit_type NOT NULL DEFAULT 'daire',
    gross_sqm NUMERIC(10, 2),
    net_sqm NUMERIC(10, 2),
    land_share NUMERIC(10, 4), -- arsa payı
    dues_coefficient NUMERIC(6, 4) NOT NULL DEFAULT 1, -- aidat katsayısı
    title_deed_no TEXT, -- tapu no
    title_deed_type TEXT, -- tapu niteliği
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (block_id, unit_number)
);
CREATE INDEX idx_units_site_id ON units(site_id);
CREATE INDEX idx_units_block_id ON units(block_id);

CREATE TABLE common_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    area_sqm NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (site_id, name)
);
CREATE INDEX idx_common_areas_site_id ON common_areas(site_id);
