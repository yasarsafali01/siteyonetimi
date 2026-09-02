import { apiClient } from "./client";
import type { Block, CommonArea, Site, SiteManager, Unit, UnitType } from "../types/site";

export async function listSites() {
  const { data } = await apiClient.get<Site[]>("/sites");
  return data;
}

export async function createSite(input: { name: string; address?: string }) {
  const { data } = await apiClient.post<Site>("/sites", input);
  return data;
}

export async function getSite(siteId: string) {
  const { data } = await apiClient.get<Site>(`/sites/${siteId}`);
  return data;
}

export async function listBlocks(siteId: string) {
  const { data } = await apiClient.get<Block[]>(`/sites/${siteId}/blocks`);
  return data;
}

export async function createBlock(siteId: string, input: { name: string; floorCount?: number }) {
  const { data } = await apiClient.post<Block>(`/sites/${siteId}/blocks`, input);
  return data;
}

export async function listUnits(blockId: string) {
  const { data } = await apiClient.get<Unit[]>(`/blocks/${blockId}/units`);
  return data;
}

export interface UnitInput {
  unitNumber: string;
  floor?: number;
  type: UnitType;
  grossSqm?: number;
  netSqm?: number;
  landShare?: number;
  duesCoefficient?: number;
  titleDeedNo?: string;
  titleDeedType?: string;
}

export async function createUnit(blockId: string, input: UnitInput) {
  const { data } = await apiClient.post<Unit>(`/blocks/${blockId}/units`, input);
  return data;
}

export async function listCommonAreas(siteId: string) {
  const { data } = await apiClient.get<CommonArea[]>(`/sites/${siteId}/common-areas`);
  return data;
}

export async function createCommonArea(siteId: string, input: { name: string; description?: string; areaSqm?: number }) {
  const { data } = await apiClient.post<CommonArea>(`/sites/${siteId}/common-areas`, input);
  return data;
}

export async function listManagers(siteId: string) {
  const { data } = await apiClient.get<SiteManager[]>(`/sites/${siteId}/managers`);
  return data;
}

export async function addManager(siteId: string, userId: string) {
  await apiClient.post(`/sites/${siteId}/managers`, { userId });
}

export async function removeManager(siteId: string, userId: string) {
  await apiClient.delete(`/sites/${siteId}/managers/${userId}`);
}
