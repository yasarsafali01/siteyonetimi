import { apiClient } from "./client";
import type { Checkpoint, Incident, IncidentSeverity, Patrol, PatrolScan, SecurityShift } from "../types/security";

export async function listCheckpoints(siteId: string) {
  const { data } = await apiClient.get<Checkpoint[]>(`/sites/${siteId}/checkpoints`);
  return data;
}

export async function createCheckpoint(siteId: string, input: { name: string; location?: string }) {
  const { data } = await apiClient.post<Checkpoint>(`/sites/${siteId}/checkpoints`, input);
  return data;
}

export async function listPatrols(siteId: string) {
  const { data } = await apiClient.get<Patrol[]>(`/sites/${siteId}/patrols`);
  return data;
}

export async function startPatrol(siteId: string) {
  const { data } = await apiClient.post<Patrol>(`/sites/${siteId}/patrols`);
  return data;
}

export async function scanCheckpoint(patrolId: string, checkpointId: string) {
  const { data } = await apiClient.post<PatrolScan>(`/patrols/${patrolId}/scan`, { checkpointId });
  return data;
}

export async function listScans(patrolId: string) {
  const { data } = await apiClient.get<PatrolScan[]>(`/patrols/${patrolId}/scans`);
  return data;
}

export async function completePatrol(patrolId: string, note?: string) {
  const { data } = await apiClient.post<Patrol>(`/patrols/${patrolId}/complete`, { note });
  return data;
}

export async function listIncidents(siteId: string) {
  const { data } = await apiClient.get<Incident[]>(`/sites/${siteId}/incidents`);
  return data;
}

export async function createIncident(siteId: string, input: { title: string; severity: IncidentSeverity; description?: string; cameraNote?: string }) {
  const { data } = await apiClient.post<Incident>(`/sites/${siteId}/incidents`, input);
  return data;
}

export async function listSecurityShifts(siteId: string) {
  const { data } = await apiClient.get<SecurityShift[]>(`/sites/${siteId}/security-shifts`);
  return data;
}

export async function createSecurityShift(siteId: string, input: { shiftDate: string; startTime: string; endTime: string }) {
  const { data } = await apiClient.post<SecurityShift>(`/sites/${siteId}/security-shifts`, input);
  return data;
}
