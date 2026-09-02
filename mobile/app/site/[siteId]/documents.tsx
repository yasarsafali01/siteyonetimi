import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Linking } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { SelectField } from "../../../src/components/ui/SelectField";
import { createDocument, deleteDocument, listDocuments } from "../../../src/api/document";
import type { DocumentCategory, SiteDocument } from "../../../src/types/document";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  karar_defteri: "Karar Defteri",
  tutanak: "Tutanak",
  sozlesme: "Sözleşme",
  ruhsat: "Ruhsat",
  sigorta_policesi: "Sigorta Poliçesi",
  fatura: "Fatura",
  diger: "Diğer",
};

export default function DocumentsScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [documents, setDocuments] = useState<SiteDocument[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>("sozlesme");
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [description, setDescription] = useState("");
  const [validUntil, setValidUntil] = useState("");

  async function refresh(filter?: string) {
    if (!siteId) return;
    try {
      const effective = filter ?? categoryFilter;
      setDocuments(await listDocuments(siteId, effective ? (effective as DocumentCategory) : undefined));
      setError(null);
    } catch {
      setError("Belgeler yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleFilterChange(value: string) {
    setCategoryFilter(value);
    await refresh(value);
  }

  async function handleCreate() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createDocument(siteId, { category, title, fileUrl, description: description || undefined, validUntil: validUntil || undefined });
      setDialogOpen(false);
      setTitle("");
      setFileUrl("");
      setDescription("");
      setValidUntil("");
      await refresh();
    } catch {
      setError("Belge eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id);
      await refresh();
    } catch {
      setError("Belge silinemedi");
    }
  }

  return (
    <Screen
      title="Dokümanlar"
      action={<AppButton small label="Yeni Belge" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      <SelectField
        label="Kategori Filtrele"
        value={categoryFilter}
        onChange={handleFilterChange}
        options={[{ value: "", label: "Tümü" }, ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))]}
      />

      {documents.length === 0 ? (
        <EmptyState text="Henüz belge yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {documents.map((d) => (
            <ListRow
              key={d.id}
              title={d.title}
              subtitle={`${CATEGORY_LABELS[d.category]}${d.validUntil ? ` · Geçerlilik: ${new Date(d.validUntil).toLocaleDateString("tr-TR")}` : ""}`}
              right={<AppButton small variant="text" color="error" label="Sil" onPress={() => handleDelete(d.id)} />}
              onPress={() => Linking.openURL(d.fileUrl)}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Belge" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <SelectField label="Kategori" value={category} onChange={(v) => setCategory(v as DocumentCategory)} options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
        <FormField label="Başlık" value={title} onChangeText={setTitle} autoFocus />
        <FormField label="Dosya URL" value={fileUrl} onChangeText={setFileUrl} />
        <FormField label="Açıklama" value={description} onChangeText={setDescription} />
        <FormField label="Geçerlilik Tarihi (YYYY-AA-GG)" value={validUntil} onChangeText={setValidUntil} placeholder="ruhsat/poliçe için" />
      </FormSheet>
    </Screen>
  );
}
