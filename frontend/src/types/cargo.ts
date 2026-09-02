export type CargoStatus = "teslim_alindi" | "sakine_teslim_edildi" | "iade";

export interface CargoDelivery {
  id: string;
  siteId: string;
  unitId: string | null;
  recipientPersonId: string | null;
  courierCompany: string | null;
  trackingNo: string | null;
  description: string | null;
  status: CargoStatus;
  receivedAt: string;
  deliveredAt: string | null;
  deliveredTo: string | null;
  notifiedAt: string | null;
}
