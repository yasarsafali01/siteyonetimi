export interface Person {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitResident {
  id: string;
  tenantId: string;
  unitId: string;
  personId: string;
  relation: "malik" | "kiraci";
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  personId: string;
  fullName: string;
  relation: string | null;
  phone: string | null;
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  personId: string;
  fullName: string;
  phone: string;
  relation: string | null;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  personId: string;
  plate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  createdAt: string;
}

export interface Pet {
  id: string;
  personId: string;
  name: string;
  species: string | null;
  breed: string | null;
  createdAt: string;
}

export interface PowerOfAttorney {
  id: string;
  personId: string;
  attorneyName: string;
  documentNo: string | null;
  issuedBy: string | null;
  validUntil: string | null;
  createdAt: string;
}

export interface ContactHistoryEntry {
  id: string;
  personId: string;
  channel: string;
  summary: string;
  createdAt: string;
}

export interface PersonNote {
  id: string;
  personId: string;
  note: string;
  createdAt: string;
}
