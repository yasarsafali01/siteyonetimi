import { apiClient } from "./client";
import type { DocumentCategory, SiteDocument } from "../types/document";

export async function listDocuments(siteId: string, category?: DocumentCategory) {
  const { data } = await apiClient.get<SiteDocument[]>(`/sites/${siteId}/documents`, { params: category ? { category } : undefined });
  return data;
}

export async function createDocument(
  siteId: string,
  input: { category: DocumentCategory; title: string; fileUrl: string; description?: string; validUntil?: string },
) {
  const { data } = await apiClient.post<SiteDocument>(`/sites/${siteId}/documents`, input);
  return data;
}

export async function deleteDocument(documentId: string) {
  await apiClient.delete(`/documents/${documentId}`);
}
