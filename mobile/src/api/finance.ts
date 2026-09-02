import { apiClient } from "./client";
import type { ChargeType, ChargeWithBalance, Payment, PaymentMethod, UnitBalance } from "../types/finance";

export async function bulkGenerateDues(siteId: string, input: { period: string; dueDate: string; baseAmount: number }) {
  const { data } = await apiClient.post<ChargeWithBalance[]>(`/sites/${siteId}/charges/bulk-generate`, input);
  return data;
}

export async function listChargesForSite(siteId: string) {
  const { data } = await apiClient.get<ChargeWithBalance[]>(`/sites/${siteId}/charges`);
  return data;
}

export async function listChargesForUnit(unitId: string) {
  const { data } = await apiClient.get<ChargeWithBalance[]>(`/units/${unitId}/charges`);
  return data;
}

export async function createCharge(unitId: string, input: { type: ChargeType; amount: number; description?: string; period?: string; dueDate?: string }) {
  const { data } = await apiClient.post<ChargeWithBalance>(`/units/${unitId}/charges`, input);
  return data;
}

export async function deleteCharge(chargeId: string) {
  await apiClient.delete(`/charges/${chargeId}`);
}

export async function getUnitBalance(unitId: string) {
  const { data } = await apiClient.get<UnitBalance>(`/units/${unitId}/balance`);
  return data;
}

export async function getPersonBalance(personId: string) {
  const { data } = await apiClient.get<UnitBalance>(`/persons/${personId}/balance`);
  return data;
}

export async function createPayment(chargeId: string, input: { amount: number; method: PaymentMethod; note?: string }) {
  const { data } = await apiClient.post<Payment>(`/charges/${chargeId}/payments`, input);
  return data;
}

export async function listPaymentsForCharge(chargeId: string) {
  const { data } = await apiClient.get<Payment[]>(`/charges/${chargeId}/payments`);
  return data;
}
