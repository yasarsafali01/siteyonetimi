import { apiClient } from "./client";
import type { AccessCredential, AccessCredentialType, AccessLog, AccessPoint, AccessPointType } from "../types/access";

export async function listAccessPoints(siteId: string) {
  const { data } = await apiClient.get<AccessPoint[]>(`/sites/${siteId}/access-points`);
  return data;
}

export async function createAccessPoint(siteId: string, input: { name: string; type: AccessPointType; location?: string }) {
  const { data } = await apiClient.post<AccessPoint>(`/sites/${siteId}/access-points`, input);
  return data;
}

export async function listCredentials(siteId: string) {
  const { data } = await apiClient.get<AccessCredential[]>(`/sites/${siteId}/access-credentials`);
  return data;
}

export async function createCredential(
  siteId: string,
  input: { type: AccessCredentialType; credentialValue: string; personId?: string; unitId?: string; validUntil?: string },
) {
  const { data } = await apiClient.post<AccessCredential>(`/sites/${siteId}/access-credentials`, input);
  return data;
}

export async function revokeCredential(credentialId: string) {
  const { data } = await apiClient.post<AccessCredential>(`/access-credentials/${credentialId}/revoke`);
  return data;
}

export async function scanAccessPoint(siteId: string, pointId: string, method: AccessCredentialType, value: string) {
  const { data } = await apiClient.post<AccessLog>(`/sites/${siteId}/access-points/${pointId}/scan`, { method, value });
  return data;
}

export async function listAccessLogs(siteId: string) {
  const { data } = await apiClient.get<AccessLog[]>(`/sites/${siteId}/access-logs`);
  return data;
}
