export type ParkingSpotType = "sakin" | "misafir" | "engelli";
export type ParkingOwnerType = "sakin" | "misafir";
export type ParkingReservationStatus = "aktif" | "iptal" | "tamamlandi";

export interface ParkingSpot {
  id: string;
  siteId: string;
  spotNumber: string;
  spotType: ParkingSpotType;
  unitId: string | null;
  isActive: boolean;
}

export interface ParkingVehicleRecord {
  id: string;
  siteId: string;
  spotId: string | null;
  plate: string;
  ownerType: ParkingOwnerType;
  unitId: string | null;
  enteredAt: string;
  exitedAt: string | null;
}

export interface ParkingReservation {
  id: string;
  siteId: string;
  spotId: string;
  unitId: string | null;
  startTime: string;
  endTime: string;
  status: ParkingReservationStatus;
}
