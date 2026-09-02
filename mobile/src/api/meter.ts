import { apiClient } from "./client";
import type { ConsumptionEntry, Meter, MeterType, Reading } from "../types/meter";

export async function listMeters(siteId: string) {
  const { data } = await apiClient.get<Meter[]>(`/sites/${siteId}/meters`);
  return data;
}

export async function createMeter(siteId: string, input: { unitId?: string; type: MeterType; serialNo?: string; unitPrice: number }) {
  const { data } = await apiClient.post<Meter>(`/sites/${siteId}/meters`, input);
  return data;
}

export async function listReadings(meterId: string) {
  const { data } = await apiClient.get<Reading[]>(`/meters/${meterId}/readings`);
  return data;
}

export async function createReading(meterId: string, input: { readingDate: string; value: number }) {
  const { data } = await apiClient.post<Reading>(`/meters/${meterId}/readings`, input);
  return data;
}

export async function getConsumptionHistory(meterId: string) {
  const { data } = await apiClient.get<ConsumptionEntry[]>(`/meters/${meterId}/consumption`);
  return data;
}

export async function generateInvoice(meterId: string) {
  const { data } = await apiClient.post(`/meters/${meterId}/invoice`);
  return data;
}
