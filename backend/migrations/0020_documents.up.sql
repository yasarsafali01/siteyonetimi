-- Modül 21: Doküman Yönetimi — karar defteri, tutanaklar, sözleşmeler, ruhsatlar,
-- sigorta poliçeleri, faturalar. Dosyalar gerçek nesne depolama (MinIO) yerine URL
-- girişi ile tutulur — modül 8'deki request_attachments ile aynı yaklaşım; MinIO
-- entegrasyonu (modül 26) geldiğinde gerçek upload'a geçilebilir.

CREATE TYPE document_category AS ENUM ('karar_defteri', 'tutanak', 'sozlesme', 'ruhsat', 'sigorta_policesi', 'fatura', 'diger');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    category document_category NOT NULL DEFAULT 'diger',
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    valid_until DATE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_site_id ON documents(site_id);
CREATE INDEX idx_documents_category ON documents(category);
