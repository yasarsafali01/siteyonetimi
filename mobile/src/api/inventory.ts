import { apiClient } from "./client";
import type { Asset, AssetCount, Depreciation } from "../types/inventory";

export async function listAssets(siteId: string) {
  const { data } = await apiClient.get<Asset[]>(`/sites/${siteId}/assets`);
  return data;
}

export async function createAsset(
  siteId: string,
  input: {
    name: string;
    serialNo?: string;
    category?: string;
    purchaseDate?: string;
    purchasePrice?: number;
    usefulLifeYears?: number;
    warrantyUntil?: string;
  }
) {
  const { data } = await apiClient.post<Asset>(`/sites/${siteId}/assets`, input);
  return data;
}

export async function getDepreciation(assetId: string) {
  const { data } = await apiClient.get<Depreciation>(`/assets/${assetId}/depreciation`);
  return data;
}

export async function assignAsset(assetId: string, userId: string, note?: string) {
  const { data } = await apiClient.post(`/assets/${assetId}/assign`, { userId, note });
  return data;
}

export async function returnAsset(assetId: string) {
  await apiClient.post(`/assets/${assetId}/return`);
}

export async function listCounts(siteId: string) {
  const { data } = await apiClient.get<AssetCount[]>(`/sites/${siteId}/asset-counts`);
  return data;
}

export async function createCount(siteId: string, note?: string) {
  const { data } = await apiClient.post<AssetCount>(`/sites/${siteId}/asset-counts`, { note });
  return data;
}

export async function addCountItem(countId: string, assetId: string, found: boolean, note?: string) {
  const { data } = await apiClient.post(`/asset-counts/${countId}/items`, { assetId, found, note });
  return data;
}
