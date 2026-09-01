export interface Employee {
  id: string;
  siteId: string;
  firstName: string;
  lastName: string;
  position: string | null;
  phone: string | null;
  nationalId: string | null;
  hireDate: string | null;
  isActive: boolean;
}

export interface Shift {
  id: string;
  employeeId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  workDate: string;
  checkIn: string | null;
  checkOut: string | null;
  note: string | null;
}

export type LeaveType = "yillik_izin" | "ucretsiz_izin" | "hastalik_izni" | "mazeret_izni";
export type LeaveStatus = "bekliyor" | "onaylandi" | "reddedildi";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason: string | null;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  amount: number;
  requestedAt: string;
  note: string | null;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewDate: string;
  score: number;
  comment: string | null;
}
