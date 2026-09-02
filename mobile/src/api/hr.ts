import { apiClient } from "./client";
import type { Employee, LeaveRequest, PerformanceReview, SalaryAdvance, Shift, Timesheet } from "../types/hr";

export async function listEmployees(siteId: string) {
  const { data } = await apiClient.get<Employee[]>(`/sites/${siteId}/employees`);
  return data;
}

export async function createEmployee(siteId: string, input: { firstName: string; lastName: string; position?: string; phone?: string }) {
  const { data } = await apiClient.post<Employee>(`/sites/${siteId}/employees`, input);
  return data;
}

function makeSubResource<T>(segment: string) {
  return {
    list: async (employeeId: string) => {
      const { data } = await apiClient.get<T[]>(`/employees/${employeeId}/${segment}`);
      return data;
    },
    create: async (employeeId: string, input: Record<string, unknown>) => {
      const { data } = await apiClient.post<T>(`/employees/${employeeId}/${segment}`, input);
      return data;
    },
  };
}

export const shifts = makeSubResource<Shift>("shifts");
export const timesheets = makeSubResource<Timesheet>("timesheets");
export const leaveRequests = makeSubResource<LeaveRequest>("leave-requests");
export const salaryAdvances = makeSubResource<SalaryAdvance>("salary-advances");
export const performanceReviews = makeSubResource<PerformanceReview>("performance-reviews");

export async function decideLeaveRequest(leaveId: string, approve: boolean) {
  const { data } = await apiClient.post<LeaveRequest>(`/leave-requests/${leaveId}/decide`, { approve });
  return data;
}
