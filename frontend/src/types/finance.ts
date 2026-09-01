export type ChargeType = "aidat" | "ek_aidat" | "ozel_gider" | "gecikme_faizi" | "gecikme_tazminati";
export type PaymentMethod = "nakit" | "banka_havalesi" | "diger";

export interface ChargeWithBalance {
  id: string;
  tenantId: string;
  siteId: string;
  unitId: string;
  type: ChargeType;
  period: string | null;
  description: string | null;
  amount: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  paidAmount: number;
  remainingAmount: number;
}

export interface Payment {
  id: string;
  chargeId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  note: string | null;
  createdAt: string;
}

export interface UnitBalance {
  unitId?: string;
  totalCharged: number;
  totalPaid: number;
  remainingAmount: number;
}
