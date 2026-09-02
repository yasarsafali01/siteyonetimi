export type AccessCredentialType = "qr" | "nfc" | "kart" | "plaka";
export type AccessPointType = "bariyer" | "turnike" | "kapi";

export interface AccessPoint {
  id: string;
  siteId: string;
  name: string;
  type: AccessPointType;
  location: string | null;
  isActive: boolean;
}

export interface AccessCredential {
  id: string;
  siteId: string;
  personId: string | null;
  unitId: string | null;
  type: AccessCredentialType;
  credentialValue: string;
  isActive: boolean;
  validFrom: string;
  validUntil: string | null;
}

export interface AccessLog {
  id: string;
  siteId: string;
  accessPointId: string;
  credentialId: string | null;
  method: AccessCredentialType;
  credentialValueSnapshot: string;
  granted: boolean;
  occurredAt: string;
}
