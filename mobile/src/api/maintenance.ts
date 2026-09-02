import { apiClient } from "./client";
import type { Facility, FacilityType, MaintenancePlan, WorkOrder, WorkOrderStatus } from "../types/maintenance";

export async function listFacilities(siteId: string) {
  const { data } = await apiClient.get<Facility[]>(`/sites/${siteId}/facilities`);
  return data;
}

export async function createFacility(siteId: string, input: { type: FacilityType; name: string; location?: string }) {
  const { data } = await apiClient.post<Facility>(`/sites/${siteId}/facilities`, input);
  return data;
}

export async function listPlans(facilityId: string) {
  const { data } = await apiClient.get<MaintenancePlan[]>(`/facilities/${facilityId}/plans`);
  return data;
}

export async function createPlan(facilityId: string, input: { title: string; frequencyDays: number; nextDueDate: string }) {
  const { data } = await apiClient.post<MaintenancePlan>(`/facilities/${facilityId}/plans`, input);
  return data;
}

export async function listDuePlans(siteId: string) {
  const { data } = await apiClient.get<MaintenancePlan[]>(`/sites/${siteId}/maintenance/due-plans`);
  return data;
}

export async function listWorkOrders(siteId: string, status = "") {
  const { data } = await apiClient.get<WorkOrder[]>(`/sites/${siteId}/work-orders`, { params: { status } });
  return data;
}

export async function createWorkOrder(siteId: string, input: { facilityId?: string; planId?: string; title: string; description?: string }) {
  const { data } = await apiClient.post<WorkOrder>(`/sites/${siteId}/work-orders`, input);
  return data;
}

export async function assignWorkOrder(workOrderId: string, assigneeId: string) {
  const { data } = await apiClient.post<WorkOrder>(`/work-orders/${workOrderId}/assign`, { assigneeId });
  return data;
}

export async function completeWorkOrder(workOrderId: string, note?: string) {
  const { data } = await apiClient.post<WorkOrder>(`/work-orders/${workOrderId}/complete`, { note });
  return data;
}

export type { WorkOrderStatus };
