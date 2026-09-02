import { apiClient } from "./client";
import type { CollectionRatePeriod, Dashboard, Debtor } from "../types/reporting";

export async function getDashboard(siteId: string) {
  const { data } = await apiClient.get<Dashboard>(`/sites/${siteId}/reports/dashboard`);
  return data;
}

export async function getCollectionRate(siteId: string, months = 6) {
  const { data } = await apiClient.get<CollectionRatePeriod[]>(`/sites/${siteId}/reports/collection-rate`, { params: { months } });
  return data;
}

export async function getDebtors(siteId: string) {
  const { data } = await apiClient.get<Debtor[]>(`/sites/${siteId}/reports/debtors`);
  return data;
}
