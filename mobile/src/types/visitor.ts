export type InvitationStatus = "bekliyor" | "onaylandi" | "reddedildi" | "kullanildi" | "iptal";

export interface VisitorInvitation {
  id: string;
  siteId: string;
  unitId: string | null;
  hostPersonId: string | null;
  visitorName: string;
  visitorPhone: string | null;
  vehiclePlate: string | null;
  invitationCode: string;
  validFrom: string;
  validUntil: string;
  status: InvitationStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface VisitorLog {
  id: string;
  siteId: string;
  unitId: string | null;
  invitationId: string | null;
  visitorName: string;
  visitorPhone: string | null;
  idNumber: string | null;
  vehiclePlate: string | null;
  tempCardNo: string | null;
  checkedInAt: string;
  checkedOutAt: string | null;
  note: string | null;
}
