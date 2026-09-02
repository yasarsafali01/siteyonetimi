export type DocumentCategory = "karar_defteri" | "tutanak" | "sozlesme" | "ruhsat" | "sigorta_policesi" | "fatura" | "diger";

export interface SiteDocument {
  id: string;
  siteId: string;
  category: DocumentCategory;
  title: string;
  description: string | null;
  fileUrl: string;
  validUntil: string | null;
  createdAt: string;
}
