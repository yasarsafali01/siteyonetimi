export type FacilityType = "asansor" | "jenerator" | "havuz" | "yangin_sistemi" | "diger";
export type WorkOrderStatus = "planlandi" | "devam_ediyor" | "tamamlandi" | "iptal";

export interface Facility {
  id: string;
  siteId: string;
  type: FacilityType;
  name: string;
  location: string | null;
  createdAt: string;
}

export interface MaintenancePlan {
  id: string;
  facilityId: string;
  title: string;
  frequencyDays: number;
  nextDueDate: string;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  siteId: string;
  facilityId: string | null;
  planId: string | null;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  scheduledDate: string | null;
  completedAt: string | null;
  completionNote: string | null;
  assignedTo: string | null;
  createdAt: string;
}
