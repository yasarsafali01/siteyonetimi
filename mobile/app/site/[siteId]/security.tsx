import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Modal, StyleSheet, Text, View } from "react-native";
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
  completePatrol,
  createCheckpoint,
  createIncident,
  createSecurityShift,
  listCheckpoints,
  listIncidents,
  listPatrols,
  listScans,
  listSecurityShifts,
  scanCheckpoint,
  startPatrol,
} from "../../../src/api/security";
import type { Checkpoint, Incident, IncidentSeverity, Patrol, PatrolScan, SecurityShift } from "../../../src/types/security";

const SEVERITY_LABELS: Record<IncidentSeverity, string> = { dusuk: "Düşük", orta: "Orta", yuksek: "Yüksek", kritik: "Kritik" };
const SEVERITY_TONE: Record<IncidentSeverity, "default" | "warning" | "error"> = { dusuk: "default", orta: "warning", yuksek: "error", kritik: "error" };

export default function SecurityScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [shiftList, setShiftList] = useState<SecurityShift[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [cpDialogOpen, setCpDialogOpen] = useState(false);
  const [cpName, setCpName] = useState("");

  const [patrolDetail, setPatrolDetail] = useState<Patrol | null>(null);
  const [scans, setScans] = useState<PatrolScan[]>([]);

  const [incDialogOpen, setIncDialogOpen] = useState(false);
  const [incTitle, setIncTitle] = useState("");
  const [incSeverity, setIncSeverity] = useState<IncidentSeverity>("dusuk");
  const [incCameraNote, setIncCameraNote] = useState("");

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftStart, setShiftStart] = useState("00:00");
  const [shiftEnd, setShiftEnd] = useState("08:00");

  async function refresh() {
    if (!siteId) return;
    try {
      const [cp, pt, inc, sh] = await Promise.all([
        listCheckpoints(siteId),
        listPatrols(siteId),
        listIncidents(siteId),
        listSecurityShifts(siteId),
      ]);
      setCheckpoints(cp);
      setPatrols(pt);
      setIncidents(inc);
      setShiftList(sh);
      setError(null);
    } catch {
      setError("Güvenlik verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  function checkpointName(id: string) {
    return checkpoints.find((c) => c.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreateCheckpoint() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createCheckpoint(siteId, { name: cpName });
      setCpDialogOpen(false);
      setCpName("");
      await refresh();
    } catch {
      setError("Kontrol noktası oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartPatrol() {
    if (!siteId) return;
    try {
      const p = await startPatrol(siteId);
      await refresh();
      setPatrolDetail(p);
      setScans([]);
    } catch {
      setError("Devriye başlatılamadı");
    }
  }

  async function handleScan(checkpointId: string) {
    if (!patrolDetail) return;
    try {
      await scanCheckpoint(patrolDetail.id, checkpointId);
      setScans(await listScans(patrolDetail.id));
    } catch {
      setError("Kontrol noktası taranamadı");
    }
  }

  async function handleCompletePatrol() {
    if (!patrolDetail) return;
    try {
      await completePatrol(patrolDetail.id, "Tur tamamlandı");
      await refresh();
      setPatrolDetail(null);
    } catch {
      setError("Devriye tamamlanamadı");
    }
  }

  async function handleCreateIncident() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createIncident(siteId, { title: incTitle, severity: incSeverity, cameraNote: incCameraNote || undefined });
      setIncDialogOpen(false);
      setIncTitle("");
      setIncCameraNote("");
      await refresh();
    } catch {
      setError("Olay kaydı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateShift() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createSecurityShift(siteId, { shiftDate, startTime: shiftStart, endTime: shiftEnd });
      setShiftDialogOpen(false);
      await refresh();
    } catch {
      setError("Vardiya oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tur Kontrol Noktaları</Text>
        <AppButton small label="Yeni Nokta" onPress={() => setCpDialogOpen(true)} />
      </View>
      {checkpoints.length === 0 ? (
        <EmptyState text="Henüz kontrol noktası yok." />
      ) : (
        <View style={styles.chipRow}>
          {checkpoints.map((c) => <Chip key={c.id} label={c.name} />)}
        </View>
      )}

      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Devriye Turları</Text>
        <AppButton small label="Devriye Başlat" onPress={handleStartPatrol} disabled={checkpoints.length === 0} />
      </View>
      {patrols.length === 0 ? (
        <EmptyState text="Henüz devriye kaydı yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {patrols.map((p) => (
            <ListRow
              key={p.id}
              title={new Date(p.startedAt).toLocaleString("tr-TR")}
              subtitle={p.completedAt ? "Tamamlandı" : "Devam Ediyor"}
              onPress={
                !p.completedAt
                  ? async () => { setPatrolDetail(p); setScans(await listScans(p.id)); }
                  : undefined
              }
            />
          ))}
        </Card>
      )}

      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Olay Kayıtları</Text>
        <AppButton small label="Yeni Olay" onPress={() => setIncDialogOpen(true)} />
      </View>
      {incidents.length === 0 ? (
        <EmptyState text="Henüz olay kaydı yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {incidents.map((inc) => (
            <ListRow key={inc.id} title={inc.title} subtitle={inc.cameraNote ?? undefined} right={<Chip label={SEVERITY_LABELS[inc.severity]} tone={SEVERITY_TONE[inc.severity]} />} />
          ))}
        </Card>
      )}

      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Vardiya Takibi</Text>
        <AppButton small label="Yeni Vardiya" onPress={() => setShiftDialogOpen(true)} />
      </View>
      {shiftList.length === 0 ? (
        <EmptyState text="Henüz vardiya kaydı yok." />
      ) : (
        shiftList.map((s) => (
          <Text key={s.id} style={styles.shiftText}>
            {new Date(s.shiftDate).toLocaleDateString("tr-TR")} {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
          </Text>
        ))
      )}

      <FormSheet visible={cpDialogOpen} title="Yeni Kontrol Noktası" onClose={() => setCpDialogOpen(false)} onSubmit={handleCreateCheckpoint} submitting={submitting}>
        <FormField label="Ad" value={cpName} onChangeText={setCpName} autoFocus />
      </FormSheet>

      <FormSheet visible={incDialogOpen} title="Yeni Olay Kaydı" onClose={() => setIncDialogOpen(false)} onSubmit={handleCreateIncident} submitting={submitting}>
        <FormField label="Başlık" value={incTitle} onChangeText={setIncTitle} autoFocus />
        <SelectField label="Önem Derecesi" value={incSeverity} onChange={(v) => setIncSeverity(v as IncidentSeverity)} options={Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ value, label }))} />
        <FormField label="Kamera Notu" value={incCameraNote} onChangeText={setIncCameraNote} />
      </FormSheet>

      <FormSheet visible={shiftDialogOpen} title="Yeni Vardiya" onClose={() => setShiftDialogOpen(false)} onSubmit={handleCreateShift} submitting={submitting}>
        <FormField label="Tarih (YYYY-AA-GG)" value={shiftDate} onChangeText={setShiftDate} />
        <FormField label="Başlangıç (SS:DD)" value={shiftStart} onChangeText={setShiftStart} />
        <FormField label="Bitiş (SS:DD)" value={shiftEnd} onChangeText={setShiftEnd} />
      </FormSheet>

      <Modal visible={Boolean(patrolDetail)} animationType="slide" onRequestClose={() => setPatrolDetail(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Screen title="Devriye Yönetimi" action={<AppButton small variant="text" label="Kapat" onPress={() => setPatrolDetail(null)} />}>
            <Text style={styles.sectionTitle}>Taranan Noktalar</Text>
            {scans.length === 0 ? (
              <EmptyState text="Henüz nokta taranmadı." />
            ) : (
              scans.map((s) => (
                <Text key={s.id} style={styles.shiftText}>{checkpointName(s.checkpointId)} — {new Date(s.scannedAt).toLocaleTimeString("tr-TR")}</Text>
              ))
            )}
            <View style={[styles.chipRow, { marginTop: 12, marginBottom: 20 }]}>
              {checkpoints.map((c) => (
                <AppButton key={c.id} small variant="outlined" label={`${c.name} Tara`} onPress={() => handleScan(c.id)} />
              ))}
            </View>
            <AppButton label="Devriyeyi Tamamla" onPress={handleCompletePatrol} />
          </Screen>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  shiftText: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
});
