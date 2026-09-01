export type AssetStatus = "depoda" | "zimmetli" | "hurda" | "kayip";

export interface Asset {
  id: string;
  siteId: string;
  name: string;
  serialNo: string | null;
  category: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  usefulLifeYears: number | null;
  warrantyUntil: string | null;
  status: AssetStatus;
  assignedTo: string | null;
  createdAt: string;
}

export interface Depreciation {
  assetId: string;
  purchasePrice: number;
  usefulLifeYears: number;
  annualAmount: number;
  ageYears: number;
  accumulatedAmount: number;
  bookValue: number;
}

export interface AssetCount {
  id: string;
  siteId: string;
  countDate: string;
  note: string | null;
}
