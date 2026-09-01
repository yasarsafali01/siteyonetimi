import { apiClient } from "./client";
import type { Attachment, RequestPriority, RequestStatus, RequestType, ServiceRequest, StatusChange } from "../types/request";

export async function listRequests(siteId: string, status = "") {
  const { data } = await apiClient.get<ServiceRequest[]>(`/sites/${siteId}/requests`, { params: { status } });
  return data;
}

export async function createRequest(siteId: string, input: { type: RequestType; title: string; description?: string; priority: RequestPriority }) {
  const { data } = await apiClient.post<ServiceRequest>(`/sites/${siteId}/requests`, input);
  return data;
}

export async function assignRequest(requestId: string, assigneeId: string) {
  const { data } = await apiClient.post<ServiceRequest>(`/requests/${requestId}/assign`, { assigneeId });
  return data;
}

export async function changeRequestStatus(requestId: string, status: RequestStatus, note?: string) {
  const { data } = await apiClient.post<ServiceRequest>(`/requests/${requestId}/status`, { status, note });
  return data;
}

export async function listStatusHistory(requestId: string) {
  const { data } = await apiClient.get<StatusChange[]>(`/requests/${requestId}/status-history`);
  return data;
}

export async function listAttachments(requestId: string) {
  const { data } = await apiClient.get<Attachment[]>(`/requests/${requestId}/attachments`);
  return data;
}

export async function addAttachment(requestId: string, fileName: string, fileUrl: string) {
  const { data } = await apiClient.post<Attachment>(`/requests/${requestId}/attachments`, { fileName, fileUrl });
  return data;
}
