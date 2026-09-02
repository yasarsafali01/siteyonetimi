-- Modül 19: Duyuru ve İletişim Merkezi — duyurular, haberler; SMS/E-posta/Push/WhatsApp
-- kanalları burada sadece "gönderilsin" niyeti (channels) olarak tutulur, gerçek gönderim
-- entegrasyonu (SMS/WhatsApp Business/Firebase FCM sağlayıcıları) Entegrasyonlar modülüne
-- (26) bırakıldı.

CREATE TYPE announcement_category AS ENUM ('duyuru', 'haber');

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category announcement_category NOT NULL DEFAULT 'duyuru',
    target_block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
    channels TEXT[] NOT NULL DEFAULT '{site_ici}',
    published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_announcements_site_id ON announcements(site_id);
