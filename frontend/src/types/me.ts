import type { UserType } from "./user";

export interface Residency {
  unitId: string;
  unitNumber: string;
  blockId: string;
  blockName: string;
  siteId: string;
  siteName: string;
  relation: "malik" | "kiraci";
}

export interface Me {
  id: string;
  email: string;
  fullName: string;
  userType: UserType;
  isSuperAdmin: boolean;
  personId: string | null;
  personName: string | null;
  residencies: Residency[] | null;
}
