import { apiClient } from "./client";
import type { CargoDelivery } from "../types/cargo";

export async function listCargoDeliveries(siteId: string) {
  const { data } = await apiClient.get<CargoDelivery[]>(`/sites/${siteId}/cargo-deliveries`);
  return data;
}

export async function createCargoDelivery(
  siteId: string,
  input: { courierCompany?: string; trackingNo?: string; description?: string; unitId?: string; recipientPersonId?: string },
) {
  const { data } = await apiClient.post<CargoDelivery>(`/sites/${siteId}/cargo-deliveries`, input);
  return data;
}

export async function deliverToResident(deliveryId: string, deliveredTo: string) {
  const { data } = await apiClient.post<CargoDelivery>(`/cargo-deliveries/${deliveryId}/deliver`, { deliveredTo });
  return data;
}

export async function markCargoReturned(deliveryId: string) {
  const { data } = await apiClient.post<CargoDelivery>(`/cargo-deliveries/${deliveryId}/return`);
  return data;
}

export async function notifyCargoRecipient(deliveryId: string) {
  const { data } = await apiClient.post<CargoDelivery>(`/cargo-deliveries/${deliveryId}/notify`);
  return data;
}
