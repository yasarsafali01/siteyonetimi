-- Modül 11: Satın Alma ve Tedarikçi — talep oluşturma, teklif toplama, tedarikçi yönetimi,
-- onay akışları, sipariş yönetimi, fatura takibi.

CREATE TYPE purchase_request_status AS ENUM ('taslak', 'onay_bekliyor', 'onaylandi', 'reddedildi', 'siparis_verildi', 'tamamlandi');
CREATE TYPE purchase_order_status AS ENUM ('olusturuldu', 'gonderildi', 'teslim_alindi', 'iptal');

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_suppliers_site_id ON suppliers(site_id);

CREATE TABLE purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status purchase_request_status NOT NULL DEFAULT 'taslak',
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchase_requests_site_id ON purchase_requests(site_id);

-- Teklif toplama: bir talebe karşı tedarikçilerden gelen fiyat teklifleri.
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    note TEXT,
    is_selected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quotes_request_id ON quotes(request_id);

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    request_id UUID REFERENCES purchase_requests(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    status purchase_order_status NOT NULL DEFAULT 'olusturuldu',
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchase_orders_site_id ON purchase_orders(site_id);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);

-- Fatura takibi: siparişe karşı gelen tedarikçi faturaları.
CREATE TABLE supplier_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    invoice_no TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_supplier_invoices_order_id ON supplier_invoices(order_id);
