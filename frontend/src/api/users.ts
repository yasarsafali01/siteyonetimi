import { apiClient } from "./client";
import type { AppUser, UserType } from "../types/user";

export async function listUsers() {
  const { data } = await apiClient.get<AppUser[]>(`/auth/users`);
  return data;
}

export async function createUser(input: { email: string; password: string; fullName: string; userType: UserType; personId?: string }) {
  const { data } = await apiClient.post<AppUser>(`/auth/users`, input);
  return data;
}
