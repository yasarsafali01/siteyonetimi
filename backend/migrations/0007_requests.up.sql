-- Modül 8: Arıza ve Talep Yönetimi — teknik arıza, şikayet, öneri; dosya/fotoğraf ekleri,
-- görev atama, SLA takibi, durum değişiklikleri, bildirim (log olarak).

CREATE TYPE request_type AS ENUM ('ariza', 'sikayet', 'oneri');
CREATE TYPE request_status AS ENUM ('yeni', 'atandi', 'inceleniyor', 'cozuldu', 'kapatildi');
CREATE TYPE request_priority AS ENUM ('dusuk', 'normal', 'yuksek', 'acil');

CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES persons(id) ON DELETE SET NULL,
    type request_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority request_priority NOT NULL DEFAULT 'normal',
    status request_status NOT NULL DEFAULT 'yeni',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    sla_due_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_requests_site_id ON requests(site_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_assigned_to ON requests(assigned_to);

CREATE TABLE request_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL, -- MinIO/nesne depolama entegrasyonu gelene kadar dış/geçici URL
    content_type TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_request_attachments_request_id ON request_attachments(request_id);

-- Durum değişiklikleri geçmişi.
CREATE TABLE request_status_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    from_status request_status,
    to_status request_status NOT NULL,
    note TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_request_status_changes_request_id ON request_status_changes(request_id);
