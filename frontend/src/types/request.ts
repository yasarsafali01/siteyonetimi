export type RequestType = "ariza" | "sikayet" | "oneri";
export type RequestStatus = "yeni" | "atandi" | "inceleniyor" | "cozuldu" | "kapatildi";
export type RequestPriority = "dusuk" | "normal" | "yuksek" | "acil";

export interface ServiceRequest {
  id: string;
  siteId: string;
  unitId: string | null;
  reportedBy: string | null;
  type: RequestType;
  title: string;
  description: string | null;
  priority: RequestPriority;
  status: RequestStatus;
  assignedTo: string | null;
  slaDueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatusChange {
  id: string;
  requestId: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  note: string | null;
  createdAt: string;
}

export interface Attachment {
  id: string;
  requestId: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}
