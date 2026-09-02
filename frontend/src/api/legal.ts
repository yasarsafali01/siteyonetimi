import { apiClient } from "./client";
import type { Lawyer, LegalCase, LegalCaseStatus, LegalCaseType, LegalDocument } from "../types/legal";

export async function listLawyers() {
  const { data } = await apiClient.get<Lawyer[]>(`/lawyers`);
  return data;
}

export async function createLawyer(input: { fullName: string; phone?: string; email?: string; barAssociation?: string }) {
  const { data } = await apiClient.post<Lawyer>(`/lawyers`, input);
  return data;
}

export async function listLegalCases(siteId: string) {
  const { data } = await apiClient.get<LegalCase[]>(`/sites/${siteId}/legal-cases`);
  return data;
}

export async function createLegalCase(
  siteId: string,
  input: {
    caseType: LegalCaseType;
    title: string;
    caseNo?: string;
    description?: string;
    amount?: number;
    unitId?: string;
    personId?: string;
    lawyerId?: string;
  },
) {
  const { data } = await apiClient.post<LegalCase>(`/sites/${siteId}/legal-cases`, input);
  return data;
}

export async function setLegalCaseStatus(caseId: string, status: LegalCaseStatus) {
  const { data } = await apiClient.post<LegalCase>(`/legal-cases/${caseId}/status`, { status });
  return data;
}

export async function listLegalDocuments(caseId: string) {
  const { data } = await apiClient.get<LegalDocument[]>(`/legal-cases/${caseId}/documents`);
  return data;
}

export async function addLegalDocument(caseId: string, input: { title: string; fileUrl: string }) {
  const { data } = await apiClient.post<LegalDocument>(`/legal-cases/${caseId}/documents`, input);
  return data;
}
