-- Modül 14: Ziyaretçi Yönetimi — QR davetiye, araç kaydı, giriş çıkış kayıtları,
-- geçici kartlar, onay mekanizması.

CREATE TYPE visitor_invitation_status AS ENUM ('bekliyor', 'onaylandi', 'reddedildi', 'kullanildi', 'iptal');

-- QR davetiye: sakinin misafiri için oluşturduğu, onay mekanizmasından geçen davet.
CREATE TABLE visitor_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    host_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    vehicle_plate TEXT,
    invitation_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ NOT NULL,
    status visitor_invitation_status NOT NULL DEFAULT 'bekliyor',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visitor_invitations_site_id ON visitor_invitations(site_id);
CREATE INDEX idx_visitor_invitations_unit_id ON visitor_invitations(unit_id);

-- Giriş çıkış kayıtları: bir davetle ya da doğrudan girişte oluşturulan fiili kayıt
-- (geçici kart no ve araç plakası da burada tutulur).
CREATE TABLE visitor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    invitation_id UUID REFERENCES visitor_invitations(id) ON DELETE SET NULL,
    visitor_name TEXT NOT NULL,
    visitor_phone TEXT,
    id_number TEXT,
    vehicle_plate TEXT,
    temp_card_no TEXT,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
    checked_out_at TIMESTAMPTZ,
    checked_out_by UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT
);
CREATE INDEX idx_visitor_logs_site_id ON visitor_logs(site_id);
CREATE INDEX idx_visitor_logs_invitation_id ON visitor_logs(invitation_id);
