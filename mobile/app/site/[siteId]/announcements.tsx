import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { EmptyState } from "../../../src/components/ui/ListRow";
import { Chip } from "../../../src/components/ui/Chip";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { SelectField } from "../../../src/components/ui/SelectField";
import { colors } from "../../../src/theme";
import { createAnnouncement, listAnnouncements } from "../../../src/api/announcement";
import type { Announcement, AnnouncementCategory } from "../../../src/types/announcement";

const CATEGORY_LABELS: Record<AnnouncementCategory, string> = { duyuru: "Duyuru", haber: "Haber" };
const CHANNEL_OPTIONS = [
  { value: "sms", label: "SMS" },
  { value: "eposta", label: "E-posta" },
  { value: "push", label: "Push Bildirim" },
  { value: "whatsapp", label: "WhatsApp" },
];

export default function AnnouncementsScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("duyuru");
  const [channels, setChannels] = useState<string[]>([]);

  async function refresh() {
    if (!siteId) return;
    try {
      setAnnouncements(await listAnnouncements(siteId));
      setError(null);
    } catch {
      setError("Duyurular yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  function toggleChannel(value: string) {
    setChannels((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  async function handleCreate() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createAnnouncement(siteId, { title, content, category, channels: ["site_ici", ...channels] });
      setDialogOpen(false);
      setTitle("");
      setContent("");
      setChannels([]);
      await refresh();
    } catch {
      setError("Duyuru yayınlanamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Duyurular ve Haberler"
      action={<AppButton small label="Yeni Duyuru" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {announcements.length === 0 ? (
        <EmptyState text="Henüz duyuru yok." />
      ) : (
        <View style={{ gap: 12 }}>
          {announcements.map((a) => (
            <Card key={a.id}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{a.title}</Text>
                <Chip label={CATEGORY_LABELS[a.category]} />
              </View>
              <Text style={styles.cardContent}>{a.content}</Text>
              <View style={styles.chipRow}>
                {a.channels.map((c) => <Chip key={c} label={c} />)}
                <Text style={styles.date}>{new Date(a.publishedAt).toLocaleString("tr-TR")}</Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Duyuru" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting} submitLabel="Yayınla">
        <FormField label="Başlık" value={title} onChangeText={setTitle} autoFocus />
        <FormField label="İçerik" value={content} onChangeText={setContent} multiline numberOfLines={3} />
        <SelectField label="Kategori" value={category} onChange={(v) => setCategory(v as AnnouncementCategory)} options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
        <Text style={styles.helperText}>Site içi bildirim her zaman gönderilir. Ek kanallar:</Text>
        <View style={styles.chipRow}>
          {CHANNEL_OPTIONS.map((opt) => (
            <Pressable key={opt.value} onPress={() => toggleChannel(opt.value)}>
              <Chip label={opt.label} tone={channels.includes(opt.value) ? "primary" : "default"} />
            </Pressable>
          ))}
        </View>
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, flex: 1, marginRight: 8 },
  cardContent: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  date: { fontSize: 11, color: colors.textSecondary, marginLeft: "auto" },
  helperText: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
});
