import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Linking, Modal, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { Chip } from "../../../src/components/ui/Chip";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { SelectField } from "../../../src/components/ui/SelectField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { colors } from "../../../src/theme";
import { addAttachment, assignRequest, changeRequestStatus, createRequest, listAttachments, listRequests, listStatusHistory } from "../../../src/api/request";
import { getCurrentUserId } from "../../../src/api/client";
import type { Attachment, RequestPriority, RequestStatus, RequestType, ServiceRequest, StatusChange } from "../../../src/types/request";

const TYPE_LABELS: Record<RequestType, string> = { ariza: "Arıza", sikayet: "Şikayet", oneri: "Öneri" };
const STATUS_LABELS: Record<RequestStatus, string> = {
  yeni: "Yeni",
  atandi: "Atandı",
  inceleniyor: "İnceleniyor",
  cozuldu: "Çözüldü",
  kapatildi: "Kapatıldı",
};
const STATUS_TONE: Record<RequestStatus, "default" | "info" | "warning" | "success"> = {
  yeni: "default",
  atandi: "info",
  inceleniyor: "warning",
  cozuldu: "success",
  kapatildi: "default",
};
const PRIORITY_LABELS: Record<RequestPriority, string> = { dusuk: "Düşük", normal: "Normal", yuksek: "Yüksek", acil: "Acil" };

export default function RequestsScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [type, setType] = useState<RequestType>("ariza");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("normal");

  const [detail, setDetail] = useState<ServiceRequest | null>(null);
  const [history, setHistory] = useState<StatusChange[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      setRequests(await listRequests(siteId, statusFilter));
      setError(null);
    } catch {
      setError("Talepler yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId, statusFilter]));

  async function handleCreate() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createRequest(siteId, { type, title, description: description || undefined, priority });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      await refresh();
    } catch {
      setError("Talep oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(r: ServiceRequest) {
    setDetail(r);
    await refreshDetail(r.id);
  }

  async function refreshDetail(requestId: string) {
    const [h, a] = await Promise.all([listStatusHistory(requestId), listAttachments(requestId)]);
    setHistory(h);
    setAttachments(a);
  }

  async function handleAssignToMe() {
    if (!detail) return;
    const uid = await getCurrentUserId();
    if (!uid) return;
    setSubmitting(true);
    try {
      const updated = await assignRequest(detail.id, uid);
      setDetail(updated);
      await refreshDetail(detail.id);
      await refresh();
    } catch {
      setError("Atama yapılamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(newStatus: RequestStatus) {
    if (!detail) return;
    setSubmitting(true);
    try {
      const updated = await changeRequestStatus(detail.id, newStatus, note || undefined);
      setDetail(updated);
      setNote("");
      await refreshDetail(detail.id);
      await refresh();
    } catch {
      setError("Durum güncellenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddAttachment() {
    if (!detail) return;
    setSubmitting(true);
    try {
      await addAttachment(detail.id, fileName, fileUrl);
      setFileName("");
      setFileUrl("");
      await refreshDetail(detail.id);
    } catch {
      setError("Ek eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Talepler"
      action={<AppButton small label="Yeni Talep" onPress={() => setCreateOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      <SelectField
        label="Durum Filtresi"
        value={statusFilter}
        onChange={setStatusFilter}
        options={[{ label: "Tümü", value: "" }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
      />

      {requests.length === 0 ? (
        <EmptyState text="Kayıt yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {requests.map((r) => (
            <ListRow
              key={r.id}
              title={r.title}
              subtitle={`${TYPE_LABELS[r.type]} · ${PRIORITY_LABELS[r.priority]}`}
              right={<Chip label={STATUS_LABELS[r.status]} tone={STATUS_TONE[r.status]} />}
              onPress={() => openDetail(r)}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={createOpen} title="Yeni Talep" onClose={() => setCreateOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <SelectField label="Tür" value={type} onChange={(v) => setType(v as RequestType)} options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        <FormField label="Başlık" value={title} onChangeText={setTitle} autoFocus />
        <FormField label="Açıklama" value={description} onChangeText={setDescription} multiline />
        <SelectField label="Öncelik" value={priority} onChange={(v) => setPriority(v as RequestPriority)} options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))} />
      </FormSheet>

      <Modal visible={Boolean(detail)} animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.detailContainer}>
          <Screen title={detail?.title} action={<AppButton small variant="text" label="Kapat" onPress={() => setDetail(null)} />}>
            {detail && (
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                <Chip label={STATUS_LABELS[detail.status]} tone={STATUS_TONE[detail.status]} />
                <Chip label={PRIORITY_LABELS[detail.priority]} />
              </View>
            )}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {!detail?.assignedTo && <AppButton small variant="outlined" label="Bana Ata" onPress={handleAssignToMe} disabled={submitting} />}
              {detail?.status !== "inceleniyor" && <AppButton small variant="outlined" label="İncelemeye Al" onPress={() => handleStatusChange("inceleniyor")} disabled={submitting} />}
              {detail?.status !== "cozuldu" && <AppButton small variant="outlined" label="Çözüldü" onPress={() => handleStatusChange("cozuldu")} disabled={submitting} />}
              {detail?.status !== "kapatildi" && <AppButton small variant="outlined" label="Kapat" onPress={() => handleStatusChange("kapatildi")} disabled={submitting} />}
            </View>
            <FormField label="Not (durum değişikliğiyle kaydedilir)" value={note} onChangeText={setNote} />

            <Text style={styles.sectionTitle}>Durum Geçmişi</Text>
            {history.map((h) => (
              <Text key={h.id} style={styles.historyRow}>
                {new Date(h.createdAt).toLocaleString("tr-TR")} — {STATUS_LABELS[h.toStatus]}{h.note ? ` (${h.note})` : ""}
              </Text>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Ekler (Dosya / Fotoğraf)</Text>
            {attachments.map((a) => (
              <Text key={a.id} style={styles.link} onPress={() => Linking.openURL(a.fileUrl)}>
                {a.fileName}
              </Text>
            ))}
            <View style={{ marginTop: 8 }}>
              <FormField label="Dosya Adı" value={fileName} onChangeText={setFileName} />
              <FormField label="URL" value={fileUrl} onChangeText={setFileUrl} />
              <AppButton small variant="outlined" label="Ekle" onPress={handleAddAttachment} loading={submitting} />
            </View>
          </Screen>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  detailContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  historyRow: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  link: {
    color: colors.primary,
    fontSize: 13,
    marginBottom: 4,
  },
});
