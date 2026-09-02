import { apiClient } from "./client";
import type { Announcement, AnnouncementCategory } from "../types/announcement";

export async function listAnnouncements(siteId: string) {
  const { data } = await apiClient.get<Announcement[]>(`/sites/${siteId}/announcements`);
  return data;
}

export async function createAnnouncement(
  siteId: string,
  input: { title: string; content: string; category: AnnouncementCategory; channels?: string[]; targetBlockId?: string },
) {
  const { data } = await apiClient.post<Announcement>(`/sites/${siteId}/announcements`, input);
  return data;
}
