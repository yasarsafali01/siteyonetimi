export type PurchaseRequestStatus = "taslak" | "onay_bekliyor" | "onaylandi" | "reddedildi" | "siparis_verildi" | "tamamlandi";
export type PurchaseOrderStatus = "olusturuldu" | "gonderildi" | "teslim_alindi" | "iptal";

export interface Supplier {
  id: string;
  siteId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
}

export interface PurchaseRequest {
  id: string;
  siteId: string;
  title: string;
  description: string | null;
  status: PurchaseRequestStatus;
  createdAt: string;
}

export interface Quote {
  id: string;
  requestId: string;
  supplierId: string;
  amount: number;
  note: string | null;
  isSelected: boolean;
}

export interface PurchaseOrder {
  id: string;
  siteId: string;
  requestId: string | null;
  supplierId: string;
  amount: number;
  status: PurchaseOrderStatus;
  orderedAt: string;
  deliveredAt: string | null;
}

export interface SupplierInvoice {
  id: string;
  orderId: string;
  invoiceNo: string | null;
  amount: number;
  invoiceDate: string;
  isPaid: boolean;
}
