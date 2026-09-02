-- Site yöneticisi ataması: süper admin olmayan bir "yonetici" kullanıcısının
-- hangi sitelere erişebileceğini tanımlar. Atanmamış siteler o kullanıcıya kapalıdır.
CREATE TABLE site_managers (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (site_id, user_id)
);
CREATE INDEX idx_site_managers_user_id ON site_managers(user_id);
CREATE INDEX idx_site_managers_tenant_id ON site_managers(tenant_id);
