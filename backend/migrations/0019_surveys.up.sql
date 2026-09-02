-- Modül 20: Anket ve Oylama — anket oluşturma, elektronik oylama, genel kurul oylamaları,
-- sonuç raporları. Oylama bağımsız bölüm (unit) bazlı yapılır — bir birim bir anket için
-- yalnızca bir kez oy kullanabilir (UNIQUE(survey_id, unit_id)).

CREATE TYPE survey_type AS ENUM ('anket', 'genel_kurul_oylamasi');
CREATE TYPE survey_status AS ENUM ('taslak', 'aktif', 'kapali');

CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type survey_type NOT NULL DEFAULT 'anket',
    status survey_status NOT NULL DEFAULT 'taslak',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_surveys_site_id ON surveys(site_id);

CREATE TABLE survey_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_survey_options_survey_id ON survey_options(survey_id);

CREATE TABLE survey_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES survey_options(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    voter_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (survey_id, unit_id)
);
CREATE INDEX idx_survey_votes_survey_id ON survey_votes(survey_id);
