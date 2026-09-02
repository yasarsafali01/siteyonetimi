export type LegalCaseType = "icra" | "dava" | "diger";
export type LegalCaseStatus = "acik" | "devam_ediyor" | "kapandi";

export interface Lawyer {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  barAssociation: string | null;
  isActive: boolean;
}

export interface LegalCase {
  id: string;
  siteId: string;
  unitId: string | null;
  personId: string | null;
  lawyerId: string | null;
  caseType: LegalCaseType;
  caseNo: string | null;
  title: string;
  description: string | null;
  status: LegalCaseStatus;
  amount: number | null;
  openedAt: string;
  closedAt: string | null;
}

export interface LegalDocument {
  id: string;
  legalCaseId: string;
  title: string;
  fileUrl: string;
  createdAt: string;
}
