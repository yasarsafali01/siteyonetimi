import { apiClient } from "./client";
import type { FacilityReservation } from "../types/reservation";

export async function listFacilityReservations(siteId: string) {
  const { data } = await apiClient.get<FacilityReservation[]>(`/sites/${siteId}/facility-reservations`);
  return data;
}

export async function createFacilityReservation(
  siteId: string,
  input: { commonAreaId: string; startTime: string; endTime: string; unitId?: string; note?: string },
) {
  const { data } = await apiClient.post<FacilityReservation>(`/sites/${siteId}/facility-reservations`, input);
  return data;
}

export async function decideFacilityReservation(reservationId: string, approve: boolean) {
  const { data } = await apiClient.post<FacilityReservation>(`/facility-reservations/${reservationId}/decide`, { approve });
  return data;
}

export async function cancelFacilityReservation(reservationId: string) {
  const { data } = await apiClient.post<FacilityReservation>(`/facility-reservations/${reservationId}/cancel`);
  return data;
}
