export type MeterType = "elektrik" | "su" | "dogalgaz" | "kalorimetre";

export interface Meter {
  id: string;
  siteId: string;
  unitId: string | null;
  type: MeterType;
  serialNo: string | null;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
}

export interface Reading {
  id: string;
  meterId: string;
  readingDate: string;
  value: number;
  createdAt: string;
}

export interface ConsumptionEntry {
  fromDate: string;
  toDate: string;
  fromValue: number;
  toValue: number;
  consumption: number;
}
