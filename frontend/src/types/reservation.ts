export type FacilityReservationStatus = "bekliyor" | "onaylandi" | "reddedildi" | "iptal" | "tamamlandi";

export interface FacilityReservation {
  id: string;
  siteId: string;
  commonAreaId: string;
  unitId: string | null;
  personId: string | null;
  startTime: string;
  endTime: string;
  status: FacilityReservationStatus;
  note: string | null;
}
