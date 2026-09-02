-- Modül 22: Hukuk Modülü — icra dosyaları, avukat yönetimi, dava takibi, hukuki evraklar.

CREATE TYPE legal_case_type AS ENUM ('icra', 'dava', 'diger');
CREATE TYPE legal_case_status AS ENUM ('acik', 'devam_ediyor', 'kapandi');

CREATE TABLE lawyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    bar_association TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lawyers_tenant_id ON lawyers(tenant_id);

-- İcra/dava dosyaları; genelde borçlu sakine (unit/person) karşı açılır.
CREATE TABLE legal_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE SET NULL,
    case_type legal_case_type NOT NULL DEFAULT 'icra',
    case_no TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status legal_case_status NOT NULL DEFAULT 'acik',
    amount NUMERIC(14, 2),
    opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
    closed_at DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_legal_cases_site_id ON legal_cases(site_id);
CREATE INDEX idx_legal_cases_unit_id ON legal_cases(unit_id);

-- Hukuki evraklar (dava dosyasına bağlı belgeler); dosya URL ile tutulur (bkz. modül 21 notu).
CREATE TABLE legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_legal_documents_case_id ON legal_documents(legal_case_id);
