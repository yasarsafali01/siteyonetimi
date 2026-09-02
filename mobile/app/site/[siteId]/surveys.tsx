import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { Chip } from "../../../src/components/ui/Chip";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { SelectField } from "../../../src/components/ui/SelectField";
import { colors } from "../../../src/theme";
import {
  activateSurvey,
  closeSurvey,
  createSurvey,
  getSurveyResults,
  listSurveyOptions,
  listSurveys,
  vote,
} from "../../../src/api/survey";
import type { Survey, SurveyOption, SurveyOptionResult, SurveyStatus, SurveyType } from "../../../src/types/survey";

const TYPE_LABELS: Record<SurveyType, string> = { anket: "Anket", genel_kurul_oylamasi: "Genel Kurul Oylaması" };
const STATUS_LABELS: Record<SurveyStatus, string> = { taslak: "Taslak", aktif: "Aktif", kapali: "Kapalı" };
const STATUS_TONE: Record<SurveyStatus, "default" | "success" | "warning"> = { taslak: "default", aktif: "success", kapali: "warning" };

export default function SurveysScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SurveyType>("anket");
  const [options, setOptions] = useState(["", ""]);

  const [voteSurvey, setVoteSurvey] = useState<Survey | null>(null);
  const [voteOptions, setVoteOptions] = useState<SurveyOption[]>([]);
  const [voteOptionId, setVoteOptionId] = useState("");
  const [voteUnitId, setVoteUnitId] = useState("");

  const [resultsSurvey, setResultsSurvey] = useState<Survey | null>(null);
  const [results, setResults] = useState<SurveyOptionResult[]>([]);

  async function refresh() {
    if (!siteId) return;
    try {
      setSurveys(await listSurveys(siteId));
      setError(null);
    } catch {
      setError("Anketler yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleCreate() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createSurvey(siteId, { title, description: description || undefined, type, options: options.filter((o) => o.trim()) });
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setOptions(["", ""]);
      await refresh();
    } catch {
      setError("Anket oluşturulamadı — en az iki seçenek girin");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivate(id: string) {
    try {
      await activateSurvey(id);
      await refresh();
    } catch {
      setError("Anket aktifleştirilemedi");
    }
  }

  async function handleClose(id: string) {
    try {
      await closeSurvey(id);
      await refresh();
    } catch {
      setError("Anket kapatılamadı");
    }
  }

  async function openVoteDialog(sv: Survey) {
    setVoteSurvey(sv);
    setVoteOptionId("");
    setVoteUnitId("");
    try {
      setVoteOptions(await listSurveyOptions(sv.id));
    } catch {
      setError("Seçenekler yüklenemedi");
    }
  }

  async function handleVote() {
    if (!voteSurvey) return;
    setSubmitting(true);
    try {
      await vote(voteSurvey.id, voteOptionId, voteUnitId);
      setVoteSurvey(null);
    } catch {
      setError("Oy kullanılamadı — bu birim daha önce oy kullanmış olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  async function openResults(sv: Survey) {
    setResultsSurvey(sv);
    try {
      setResults(await getSurveyResults(sv.id));
    } catch {
      setError("Sonuçlar yüklenemedi");
    }
  }

  return (
    <Screen
      title="Anket ve Oylama"
      action={<AppButton small label="Yeni Anket" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {surveys.length === 0 ? (
        <EmptyState text="Henüz anket yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {surveys.map((sv) => (
            <View key={sv.id}>
              <ListRow title={sv.title} subtitle={TYPE_LABELS[sv.type]} right={<Chip label={STATUS_LABELS[sv.status]} tone={STATUS_TONE[sv.status]} />} />
              <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 4 }}>
                {sv.status === "taslak" && <AppButton small variant="text" label="Aktifleştir" onPress={() => handleActivate(sv.id)} />}
                {sv.status === "aktif" && (
                  <>
                    <AppButton small variant="text" label="Oy Kullan" onPress={() => openVoteDialog(sv)} />
                    <AppButton small variant="text" color="error" label="Kapat" onPress={() => handleClose(sv.id)} />
                  </>
                )}
                <AppButton small variant="text" label="Sonuçlar" onPress={() => openResults(sv)} />
              </View>
            </View>
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Anket" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <FormField label="Başlık" value={title} onChangeText={setTitle} autoFocus />
        <FormField label="Açıklama" value={description} onChangeText={setDescription} multiline numberOfLines={2} />
        <SelectField label="Tür" value={type} onChange={(v) => setType(v as SurveyType)} options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        <Text style={styles.subheading}>Seçenekler</Text>
        {options.map((opt, i) => (
          <FormField
            key={i}
            label={`Seçenek ${i + 1}`}
            value={opt}
            onChangeText={(t) => setOptions((prev) => prev.map((o, idx) => (idx === i ? t : o)))}
          />
        ))}
        <AppButton small variant="outlined" label="Seçenek Ekle" onPress={() => setOptions((prev) => [...prev, ""])} />
      </FormSheet>

      <FormSheet visible={Boolean(voteSurvey)} title={`Oy Kullan — ${voteSurvey?.title ?? ""}`} onClose={() => setVoteSurvey(null)} onSubmit={handleVote} submitting={submitting} submitLabel="Oy Ver">
        <SelectField label="Seçenek" value={voteOptionId} onChange={setVoteOptionId} options={voteOptions.map((o) => ({ value: o.id, label: o.optionText }))} />
        <FormField label="Bağımsız Bölüm (Unit) ID" value={voteUnitId} onChangeText={setVoteUnitId} helperText="Bir birim bir ankette yalnızca bir kez oy kullanabilir" />
      </FormSheet>

      <FormSheet visible={Boolean(resultsSurvey)} title={`Sonuçlar — ${resultsSurvey?.title ?? ""}`} onClose={() => setResultsSurvey(null)} onSubmit={() => setResultsSurvey(null)} submitLabel="Kapat">
        {results.length === 0 ? (
          <EmptyState text="Henüz oy yok." />
        ) : (
          results.map((r) => (
            <View key={r.optionId} style={styles.resultRow}>
              <Text style={styles.resultLabel}>{r.optionText}</Text>
              <Text style={styles.resultValue}>{r.voteCount}</Text>
            </View>
          ))
        )}
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subheading: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginBottom: 6 },
  resultRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  resultLabel: { fontSize: 13, color: colors.textPrimary },
  resultValue: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
});
