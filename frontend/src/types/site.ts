export interface Site {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Block {
  id: string;
  tenantId: string;
  siteId: string;
  name: string;
  floorCount: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UnitType = "daire" | "dukkan" | "ofis";

export interface Unit {
  id: string;
  tenantId: string;
  siteId: string;
  blockId: string;
  unitNumber: string;
  floor: number | null;
  type: UnitType;
  grossSqm: number | null;
  netSqm: number | null;
  landShare: number | null;
  duesCoefficient: number;
  titleDeedNo: string | null;
  titleDeedType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommonArea {
  id: string;
  tenantId: string;
  siteId: string;
  name: string;
  description: string | null;
  areaSqm: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
