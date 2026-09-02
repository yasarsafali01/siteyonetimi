import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { Card } from "../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../src/components/ui/ListRow";
import { Chip } from "../../src/components/ui/Chip";
import { AppButton } from "../../src/components/ui/AppButton";
import { FormField } from "../../src/components/ui/FormField";
import { FormSheet } from "../../src/components/ui/FormSheet";
import { SelectField } from "../../src/components/ui/SelectField";
import { createRequest, listRequests } from "../../src/api/request";
import type { RequestPriority, RequestType, ServiceRequest } from "../../src/types/request";
import { useResident } from "../../src/auth/ResidentContext";

const REQUEST_TYPE_LABELS: Record<RequestType, string> = { ariza: "Arıza", sikayet: "Şikayet", oneri: "Öneri" };
const REQUEST_STATUS_LABELS: Record<string, string> = {
  yeni: "Yeni",
  atandi: "Atandı",
  inceleniyor: "İnceleniyor",
  cozuldu: "Çözüldü",
  kapatildi: "Kapatıldı",
};
const PRIORITY_LABELS: Record<RequestPriority, string> = { dusuk: "Düşük", normal: "Normal", yuksek: "Yüksek", acil: "Acil" };
const STATUS_TONE: Record<string, "default" | "info" | "success" | "warning"> = {
  yeni: "info",
  atandi: "info",
  inceleniyor: "warning",
  cozuldu: "success",
  kapatildi: "default",
};

export default function ResidentRequestsScreen() {
  const { activeResidency } = useResident();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState<RequestType>("ariza");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("normal");

  async function refresh() {
    try {
      setRequests(await listRequests(activeResidency.siteId));
      setError(null);
    } catch {
      setError("Talepler yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [activeResidency.siteId]));

  async function handleCreate() {
    setSubmitting(true);
    try {
      await createRequest(activeResidency.siteId, { type, title, description: description || undefined, priority });
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      await refresh();
    } catch {
      setError("Talep oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Taleplerim"
      action={<AppButton small label="Yeni Talep" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {requests.length === 0 ? (
        <EmptyState text="Henüz talebiniz yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {requests.map((r) => (
            <ListRow
              key={r.id}
              title={r.title}
              subtitle={`${REQUEST_TYPE_LABELS[r.type]} · ${PRIORITY_LABELS[r.priority]}`}
              right={<Chip label={REQUEST_STATUS_LABELS[r.status] ?? r.status} tone={STATUS_TONE[r.status] ?? "default"} />}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Talep" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <SelectField
          label="Tür"
          value={type}
          onChange={(v) => setType(v as RequestType)}
          options={Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <FormField label="Başlık" value={title} onChangeText={setTitle} autoFocus />
        <FormField label="Açıklama" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        <SelectField
          label="Öncelik"
          value={priority}
          onChange={(v) => setPriority(v as RequestPriority)}
          options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </FormSheet>
    </Screen>
  );
}
