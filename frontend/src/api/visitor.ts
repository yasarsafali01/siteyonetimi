import { apiClient } from "./client";
import type { VisitorInvitation, VisitorLog } from "../types/visitor";

export async function listInvitations(siteId: string) {
  const { data } = await apiClient.get<VisitorInvitation[]>(`/sites/${siteId}/visitor-invitations`);
  return data;
}

export async function createInvitation(
  siteId: string,
  input: { unitId?: string; hostPersonId?: string; visitorName: string; visitorPhone?: string; vehiclePlate?: string; validUntil: string },
) {
  const { data } = await apiClient.post<VisitorInvitation>(`/sites/${siteId}/visitor-invitations`, input);
  return data;
}

export async function decideInvitation(invitationId: string, approve: boolean) {
  const { data } = await apiClient.post<VisitorInvitation>(`/visitor-invitations/${invitationId}/decide`, { approve });
  return data;
}

export async function listVisitorLogs(siteId: string) {
  const { data } = await apiClient.get<VisitorLog[]>(`/sites/${siteId}/visitor-logs`);
  return data;
}

export async function checkInWalkIn(
  siteId: string,
  input: { unitId?: string; visitorName: string; visitorPhone?: string; idNumber?: string; vehiclePlate?: string; tempCardNo?: string; note?: string },
) {
  const { data } = await apiClient.post<VisitorLog>(`/sites/${siteId}/visitor-logs/check-in`, input);
  return data;
}

export async function checkInWithCode(siteId: string, code: string, tempCardNo?: string) {
  const { data } = await apiClient.post<VisitorLog>(`/sites/${siteId}/visitor-logs/check-in-code`, { code, tempCardNo });
  return data;
}

export async function checkOut(logId: string) {
  const { data } = await apiClient.post<VisitorLog>(`/visitor-logs/${logId}/check-out`);
  return data;
}
