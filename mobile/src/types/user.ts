export type UserType = "yonetici" | "sakin";

export interface AppUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  userType: UserType;
  personId: string | null;
}
