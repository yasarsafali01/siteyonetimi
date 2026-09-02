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
  createAccessPoint,
  createCredential,
  listAccessLogs,
  listAccessPoints,
  listCredentials,
  revokeCredential,
  scanAccessPoint,
} from "../../../src/api/access";
import type { AccessCredential, AccessCredentialType, AccessLog, AccessPoint, AccessPointType } from "../../../src/types/access";

const POINT_TYPE_LABELS: Record<AccessPointType, string> = { bariyer: "Bariyer", turnike: "Turnike", kapi: "Kapı" };
const CRED_TYPE_LABELS: Record<AccessCredentialType, string> = { qr: "QR", nfc: "NFC", kart: "Kart", plaka: "Plaka" };

export default function AccessControlScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [points, setPoints] = useState<AccessPoint[]>([]);
  const [credentials, setCredentials] = useState<AccessCredential[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [pointName, setPointName] = useState("");
  const [pointType, setPointType] = useState<AccessPointType>("bariyer");

  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credType, setCredType] = useState<AccessCredentialType>("kart");
  const [credValue, setCredValue] = useState("");

  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanPointId, setScanPointId] = useState("");
  const [scanMethod, setScanMethod] = useState<AccessCredentialType>("kart");
  const [scanValue, setScanValue] = useState("");
  const [scanResult, setScanResult] = useState<AccessLog | null>(null);

  async function refresh() {
    if (!siteId) return;
    try {
      const [p, c, l] = await Promise.all([listAccessPoints(siteId), listCredentials(siteId), listAccessLogs(siteId)]);
      setPoints(p);
      setCredentials(c);
      setLogs(l);
      if (p.length > 0 && !scanPointId) setScanPointId(p[0].id);
      setError(null);
    } catch {
      setError("Geçiş kontrol verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  function pointName_(id: string) {
    return points.find((p) => p.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreatePoint() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createAccessPoint(siteId, { name: pointName, type: pointType });
      setPointDialogOpen(false);
      setPointName("");
      await refresh();
    } catch {
      setError("Geçiş noktası oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCredential() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createCredential(siteId, { type: credType, credentialValue: credValue });
      setCredDialogOpen(false);
      setCredValue("");
      await refresh();
    } catch {
      setError("Kimlik bilgisi oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeCredential(id);
      await refresh();
    } catch {
      setError("Kimlik bilgisi iptal edilemedi");
    }
  }

  async function handleScan() {
    if (!siteId || !scanPointId) return;
    setSubmitting(true);
    try {
      const result = await scanAccessPoint(siteId, scanPointId, scanMethod, scanValue);
      setScanResult(result);
      await refresh();
    } catch {
      setError("Tarama işlenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Geçiş Noktaları</Text>
        <AppButton small label="Yeni Nokta" onPress={() => setPointDialogOpen(true)} />
      </View>
      {points.length === 0 ? (
        <EmptyState text="Henüz geçiş noktası yok." />
      ) : (
        <View style={styles.chipRow}>
          {points.map((p) => <Chip key={p.id} label={`${p.name} (${POINT_TYPE_LABELS[p.type]})`} />)}
        </View>
      )}

      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Kimlik Bilgileri</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <AppButton small variant="outlined" label="Tarama" onPress={() => setScanDialogOpen(true)} disabled={points.length === 0} />
          <AppButton small label="Yeni Kimlik" onPress={() => setCredDialogOpen(true)} />
        </View>
      </View>
      {credentials.length === 0 ? (
        <EmptyState text="Henüz kimlik bilgisi yok." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 20 }}>
          {credentials.map((c) => (
            <ListRow
              key={c.id}
              title={`${CRED_TYPE_LABELS[c.type]}: ${c.credentialValue}`}
              right={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Chip label={c.isActive ? "Aktif" : "İptal"} tone={c.isActive ? "success" : "default"} />
                  {c.isActive && <AppButton small variant="text" color="error" label="İptal" onPress={() => handleRevoke(c.id)} />}
                </View>
              }
            />
          ))}
        </Card>
      )}

      <Text style={styles.sectionTitle}>Geçiş Kayıtları</Text>
      {logs.length === 0 ? (
        <EmptyState text="Henüz geçiş kaydı yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {logs.map((l) => (
            <ListRow
              key={l.id}
              title={`${pointName_(l.accessPointId)} · ${CRED_TYPE_LABELS[l.method]}: ${l.credentialValueSnapshot}`}
              subtitle={new Date(l.occurredAt).toLocaleString("tr-TR")}
              right={<Chip label={l.granted ? "İzin Verildi" : "Reddedildi"} tone={l.granted ? "success" : "error"} />}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={pointDialogOpen} title="Yeni Geçiş Noktası" onClose={() => setPointDialogOpen(false)} onSubmit={handleCreatePoint} submitting={submitting}>
        <FormField label="Ad" value={pointName} onChangeText={setPointName} autoFocus />
        <SelectField label="Tür" value={pointType} onChange={(v) => setPointType(v as AccessPointType)} options={Object.entries(POINT_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
      </FormSheet>

      <FormSheet visible={credDialogOpen} title="Yeni Kimlik Bilgisi" onClose={() => setCredDialogOpen(false)} onSubmit={handleCreateCredential} submitting={submitting}>
        <SelectField label="Tür" value={credType} onChange={(v) => setCredType(v as AccessCredentialType)} options={Object.entries(CRED_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        <FormField label="Değer (kod/no/plaka)" value={credValue} onChangeText={setCredValue} autoFocus />
      </FormSheet>

      <FormSheet
        visible={scanDialogOpen}
        title="Tarama Simülasyonu"
        onClose={() => { setScanDialogOpen(false); setScanResult(null); }}
        onSubmit={handleScan}
        submitting={submitting}
        submitLabel="Tara"
      >
        <SelectField label="Geçiş Noktası" value={scanPointId} onChange={setScanPointId} options={points.map((p) => ({ value: p.id, label: p.name }))} />
        <SelectField label="Yöntem" value={scanMethod} onChange={(v) => setScanMethod(v as AccessCredentialType)} options={Object.entries(CRED_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
        <FormField label="Değer" value={scanValue} onChangeText={setScanValue} />
        {scanResult && (
          <Text style={{ color: scanResult.granted ? colors.success : colors.error, fontWeight: "700", marginTop: 4 }}>
            {scanResult.granted ? "Geçiş izni verildi" : "Geçiş reddedildi"}
          </Text>
        )}
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
