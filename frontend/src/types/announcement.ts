export type AnnouncementCategory = "duyuru" | "haber";

export interface Announcement {
  id: string;
  siteId: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  targetBlockId: string | null;
  channels: string[];
  publishedAt: string;
}
