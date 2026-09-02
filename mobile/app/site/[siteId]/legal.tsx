import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
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
  addLegalDocument,
  createLawyer,
  createLegalCase,
  listLawyers,
  listLegalCases,
  listLegalDocuments,
  setLegalCaseStatus,
} from "../../../src/api/legal";
import type { Lawyer, LegalCase, LegalCaseStatus, LegalCaseType, LegalDocument } from "../../../src/types/legal";

const TYPE_LABELS: Record<LegalCaseType, string> = { icra: "İcra", dava: "Dava", diger: "Diğer" };
const STATUS_LABELS: Record<LegalCaseStatus, string> = { acik: "Açık", devam_ediyor: "Devam Ediyor", kapandi: "Kapandı" };
const STATUS_TONE: Record<LegalCaseStatus, "warning" | "info" | "default"> = { acik: "warning", devam_ediyor: "info", kapandi: "default" };

export default function LegalScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [lawyerDialogOpen, setLawyerDialogOpen] = useState(false);
  const [lawyerName, setLawyerName] = useState("");
  const [lawyerPhone, setLawyerPhone] = useState("");

  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [caseType, setCaseType] = useState<LegalCaseType>("icra");
  const [caseTitle, setCaseTitle] = useState("");
  const [caseNo, setCaseNo] = useState("");
  const [amount, setAmount] = useState("");
  const [lawyerId, setLawyerId] = useState("");

  const [docsCase, setDocsCase] = useState<LegalCase | null>(null);
  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");

  function lawyerName_(id: string | null) {
    if (!id) return "-";
    return lawyers.find((l) => l.id === id)?.fullName ?? id.slice(0, 8);
  }

  async function refresh() {
    if (!siteId) return;
    try {
      const [l, c] = await Promise.all([listLawyers(), listLegalCases(siteId)]);
      setLawyers(l);
      setCases(c);
      setError(null);
    } catch {
      setError("Hukuk modülü verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleCreateLawyer() {
    setSubmitting(true);
    try {
      await createLawyer({ fullName: lawyerName, phone: lawyerPhone || undefined });
      setLawyerDialogOpen(false);
      setLawyerName("");
      setLawyerPhone("");
      await refresh();
    } catch {
      setError("Avukat eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCase() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createLegalCase(siteId, {
        caseType,
        title: caseTitle,
        caseNo: caseNo || undefined,
        amount: amount ? Number(amount) : undefined,
        lawyerId: lawyerId || undefined,
      });
      setCaseDialogOpen(false);
      setCaseTitle("");
      setCaseNo("");
      setAmount("");
      setLawyerId("");
      await refresh();
    } catch {
      setError("Dosya oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, status: LegalCaseStatus) {
    try {
      await setLegalCaseStatus(id, status);
      await refresh();
    } catch {
      setError("Durum güncellenemedi");
    }
  }

  async function openDocs(cs: LegalCase) {
    setDocsCase(cs);
    setDocTitle("");
    setDocUrl("");
    try {
      setDocs(await listLegalDocuments(cs.id));
    } catch {
      setError("Evraklar yüklenemedi");
    }
  }

  async function handleAddDocument() {
    if (!docsCase) return;
    setSubmitting(true);
    try {
      await addLegalDocument(docsCase.id, { title: docTitle, fileUrl: docUrl });
      setDocTitle("");
      setDocUrl("");
      setDocs(await listLegalDocuments(docsCase.id));
    } catch {
      setError("Evrak eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Avukatlar</Text>
        <AppButton small label="Yeni Avukat" onPress={() => setLawyerDialogOpen(true)} />
      </View>
      {lawyers.length === 0 ? (
        <EmptyState text="Henüz avukat kaydı yok." />
      ) : (
        <View style={styles.chipRow}>
          {lawyers.map((l) => <Chip key={l.id} label={l.fullName} />)}
        </View>
      )}

      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>İcra / Dava Dosyaları</Text>
        <AppButton small label="Yeni Dosya" onPress={() => setCaseDialogOpen(true)} />
      </View>
      {cases.length === 0 ? (
        <EmptyState text="Henüz dosya yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {cases.map((cs) => (
            <View key={cs.id}>
              <ListRow
                title={`${cs.title}${cs.caseNo ? ` (${cs.caseNo})` : ""}`}
                subtitle={`${TYPE_LABELS[cs.caseType]} · ${lawyerName_(cs.lawyerId)}${cs.amount != null ? ` · ${cs.amount.toLocaleString("tr-TR")} ₺` : ""}`}
                right={<Chip label={STATUS_LABELS[cs.status]} tone={STATUS_TONE[cs.status]} />}
              />
              <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 4 }}>
                <AppButton small variant="text" label="Evraklar" onPress={() => openDocs(cs)} />
                {cs.status === "acik" && <AppButton small variant="text" label="Devam Ediyor" onPress={() => handleStatusChange(cs.id, "devam_ediyor")} />}
                {cs.status !== "kapandi" && <AppButton small variant="text" color="success" label="Kapat" onPress={() => handleStatusChange(cs.id, "kapandi")} />}
              </View>
            </View>
          ))}
        </Card>
      )}

      <FormSheet visible={lawyerDialogOpen} title="Yeni Avukat" onClose={() => setLawyerDialogOpen(false)} onSubmit={handleCreateLawyer} submitting={submitting}>
        <FormField label="Ad Soyad" value={lawyerName} onChangeText={setLawyerName} autoFocus />
        <FormField label="Telefon" value={lawyerPhone} onChangeText={setLawyerPhone} keyboardType="phone-pad" />
      </FormSheet>

      <FormSheet visible={caseDialogOpen} title="Yeni İcra / Dava Dosyası" onClose={() => setCaseDialogOpen(false)} onSubmit={handleCreateCase} submitting={submitting}>
        <SelectField label="Tür" value={caseType} onChange={(v) => setCaseType(v as LegalCaseType)} options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        <FormField label="Başlık" value={caseTitle} onChangeText={setCaseTitle} autoFocus />
        <FormField label="Dosya No" value={caseNo} onChangeText={setCaseNo} />
        <FormField label="Tutar (TL)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <SelectField label="Avukat" value={lawyerId} onChange={setLawyerId} options={[{ value: "", label: "Seçilmedi" }, ...lawyers.map((l) => ({ value: l.id, label: l.fullName }))]} />
      </FormSheet>

      <FormSheet visible={Boolean(docsCase)} title={`Evraklar — ${docsCase?.title ?? ""}`} onClose={() => setDocsCase(null)} onSubmit={handleAddDocument} submitting={submitting} submitLabel="Ekle">
        {docs.length === 0 ? (
          <EmptyState text="Henüz evrak yok." />
        ) : (
          docs.map((d) => (
            <Text key={d.id} style={styles.link} onPress={() => Linking.openURL(d.fileUrl)}>{d.title}</Text>
          ))
        )}
        <FormField label="Başlık" value={docTitle} onChangeText={setDocTitle} />
        <FormField label="Dosya URL" value={docUrl} onChangeText={setDocUrl} />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  link: { color: colors.primary, fontSize: 13, marginBottom: 6 },
});
