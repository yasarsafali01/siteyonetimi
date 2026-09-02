import { apiClient } from "./client";
import type { ParkingOwnerType, ParkingReservation, ParkingSpot, ParkingSpotType, ParkingVehicleRecord } from "../types/parking";

export async function listParkingSpots(siteId: string) {
  const { data } = await apiClient.get<ParkingSpot[]>(`/sites/${siteId}/parking-spots`);
  return data;
}

export async function createParkingSpot(siteId: string, input: { spotNumber: string; spotType: ParkingSpotType; unitId?: string }) {
  const { data } = await apiClient.post<ParkingSpot>(`/sites/${siteId}/parking-spots`, input);
  return data;
}

export async function listVehicleRecords(siteId: string, plate?: string) {
  const { data } = await apiClient.get<ParkingVehicleRecord[]>(`/sites/${siteId}/parking-vehicles`, { params: plate ? { plate } : undefined });
  return data;
}

export async function checkInVehicle(siteId: string, input: { plate: string; ownerType: ParkingOwnerType; spotId?: string; unitId?: string }) {
  const { data } = await apiClient.post<ParkingVehicleRecord>(`/sites/${siteId}/parking-vehicles/check-in`, input);
  return data;
}

export async function checkOutVehicle(recordId: string) {
  const { data } = await apiClient.post<ParkingVehicleRecord>(`/parking-vehicles/${recordId}/check-out`);
  return data;
}

export async function listParkingReservations(siteId: string) {
  const { data } = await apiClient.get<ParkingReservation[]>(`/sites/${siteId}/parking-reservations`);
  return data;
}

export async function createParkingReservation(siteId: string, input: { spotId: string; unitId?: string; startTime: string; endTime: string }) {
  const { data } = await apiClient.post<ParkingReservation>(`/sites/${siteId}/parking-reservations`, input);
  return data;
}

export async function cancelParkingReservation(reservationId: string) {
  const { data } = await apiClient.post<ParkingReservation>(`/parking-reservations/${reservationId}/cancel`);
  return data;
}
