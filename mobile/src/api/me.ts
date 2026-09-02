import { apiClient } from "./client";
import type { Me } from "../types/me";

export async function getMe() {
  const { data } = await apiClient.get<Me>(`/auth/me`);
  return data;
}
