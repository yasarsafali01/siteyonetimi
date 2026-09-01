export type IncidentSeverity = "dusuk" | "orta" | "yuksek" | "kritik";

export interface Checkpoint {
  id: string;
  siteId: string;
  name: string;
  location: string | null;
}

export interface Patrol {
  id: string;
  siteId: string;
  guardId: string | null;
  startedAt: string;
  completedAt: string | null;
  note: string | null;
}

export interface PatrolScan {
  id: string;
  patrolId: string;
  checkpointId: string;
  scannedAt: string;
}

export interface Incident {
  id: string;
  siteId: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  cameraNote: string | null;
  occurredAt: string;
}

export interface SecurityShift {
  id: string;
  siteId: string;
  guardId: string | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
}
