import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { SelectField } from "../../../src/components/ui/SelectField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { colors, radius } from "../../../src/theme";
import { createMeter, createReading, generateInvoice, getConsumptionHistory, listMeters, listReadings } from "../../../src/api/meter";
import { listBlocks, listUnits } from "../../../src/api/sites";
import type { ConsumptionEntry, Meter, MeterType, Reading } from "../../../src/types/meter";

const METER_TYPES: { value: MeterType; label: string }[] = [
  { value: "elektrik", label: "Elektrik" },
  { value: "su", label: "Su" },
  { value: "dogalgaz", label: "Doğalgaz" },
  { value: "kalorimetre", label: "Kalorimetre" },
];

export default function MetersScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [meters, setMeters] = useState<Meter[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [type, setType] = useState<MeterType>("elektrik");
  const [serialNo, setSerialNo] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const [detailMeter, setDetailMeter] = useState<Meter | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionEntry[]>([]);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [readingValue, setReadingValue] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      const [meterData, blocks] = await Promise.all([listMeters(siteId), listBlocks(siteId)]);
      setMeters(meterData);
      const options: { id: string; label: string }[] = [];
      for (const block of blocks) {
        const units = await listUnits(block.id);
        for (const unit of units) options.push({ id: unit.id, label: `${block.name} / ${unit.unitNumber}` });
      }
      setUnitOptions(options);
      setError(null);
    } catch {
      setError("Sayaçlar yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  function unitLabel(id: string | null) {
    if (!id) return "Ortak Alan / Site Geneli";
    return unitOptions.find((u) => u.id === id)?.label ?? id.slice(0, 8);
  }

  async function handleCreateMeter() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createMeter(siteId, { unitId: unitId || undefined, type, serialNo: serialNo || undefined, unitPrice: Number(unitPrice || 0) });
      setCreateOpen(false);
      setUnitId("");
      setSerialNo("");
      setUnitPrice("");
      await refresh();
    } catch {
      setError("Sayaç oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(m: Meter) {
    setDetailMeter(m);
    setInfo(null);
    await refreshDetail(m.id);
  }

  async function refreshDetail(meterId: string) {
    const [r, c] = await Promise.all([listReadings(meterId), getConsumptionHistory(meterId)]);
    setReadings(r);
    setConsumption(c);
  }

  async function handleAddReading() {
    if (!detailMeter) return;
    setSubmitting(true);
    try {
      await createReading(detailMeter.id, { readingDate, value: Number(readingValue) });
      setReadingValue("");
      await refreshDetail(detailMeter.id);
    } catch {
      setError("Endeks girişi eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateInvoice() {
    if (!detailMeter) return;
    setSubmitting(true);
    setInfo(null);
    try {
      await generateInvoice(detailMeter.id);
      setInfo("Fatura oluşturuldu ve Finans modülüne eklendi.");
    } catch {
      setError("Fatura oluşturulamadı (en az iki okuma ve bağımsız bölüm gerekli)");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Sayaçlar"
      action={<AppButton small label="Yeni Sayaç" onPress={() => setCreateOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {meters.length === 0 ? (
        <EmptyState text="Henüz sayaç eklenmedi." />
      ) : (
        <Card style={{ padding: 0 }}>
          {meters.map((m) => (
            <ListRow
              key={m.id}
              title={`${METER_TYPES.find((t) => t.value === m.type)?.label} ${m.serialNo ? `· ${m.serialNo}` : ""}`}
              subtitle={`${unitLabel(m.unitId)} · ${m.unitPrice.toLocaleString("tr-TR")} ₺/birim`}
              onPress={() => openDetail(m)}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={createOpen} title="Yeni Sayaç" onClose={() => setCreateOpen(false)} onSubmit={handleCreateMeter} submitting={submitting}>
        <SelectField label="Tür" value={type} onChange={(v) => setType(v as MeterType)} options={METER_TYPES} />
        <SelectField
          label="Bağımsız Bölüm (opsiyonel)"
          value={unitId}
          onChange={setUnitId}
          options={[{ label: "Ortak Alan / Site Geneli", value: "" }, ...unitOptions.map((u) => ({ label: u.label, value: u.id }))]}
        />
        <FormField label="Seri No" value={serialNo} onChangeText={setSerialNo} />
        <FormField label="Birim Fiyat" value={unitPrice} onChangeText={setUnitPrice} keyboardType="numeric" />
      </FormSheet>

      <Modal visible={Boolean(detailMeter)} animationType="slide" onRequestClose={() => setDetailMeter(null)}>
        <View style={styles.detailContainer}>
          <Screen
            title={detailMeter ? `${METER_TYPES.find((t) => t.value === detailMeter.type)?.label} — ${unitLabel(detailMeter.unitId)}` : ""}
            action={<AppButton small variant="text" label="Kapat" onPress={() => setDetailMeter(null)} />}
          >
            {info && <Text style={styles.info}>{info}</Text>}
            <Text style={styles.sectionTitle}>Endeks Okumaları</Text>
            {readings.length === 0 ? (
              <EmptyState text="Henüz okuma yok." />
            ) : (
              readings.map((r) => (
                <View key={r.id} style={styles.readingRow}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{new Date(r.readingDate).toLocaleDateString("tr-TR")}</Text>
                  <Text style={{ fontWeight: "600" }}>{r.value}</Text>
                </View>
              ))
            )}
            <View style={{ flexDirection: "row", gap: 8, marginVertical: 12, alignItems: "flex-end" }}>
              <View style={{ flex: 1 }}>
                <FormField label="Tarih" value={readingDate} onChangeText={setReadingDate} />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Endeks" value={readingValue} onChangeText={setReadingValue} keyboardType="numeric" />
              </View>
              <AppButton small variant="outlined" label="Ekle" onPress={handleAddReading} loading={submitting} />
            </View>

            <Text style={styles.sectionTitle}>Tüketim Analizi</Text>
            {consumption.length === 0 ? (
              <EmptyState text="Tüketim hesaplamak için en az iki okuma gerekli." />
            ) : (
              consumption.map((c, i) => (
                <View key={i} style={styles.readingRow}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    {new Date(c.fromDate).toLocaleDateString("tr-TR")} - {new Date(c.toDate).toLocaleDateString("tr-TR")}
                  </Text>
                  <Text style={{ fontWeight: "600" }}>{c.consumption}</Text>
                </View>
              ))
            )}

            <AppButton
              label="Fatura Oluştur (Finans'a ekle)"
              onPress={handleGenerateInvoice}
              disabled={submitting || readings.length < 2 || !detailMeter?.unitId}
              loading={submitting}
            />
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
  readingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: {
    backgroundColor: colors.successLight,
    color: "#166534",
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: 12,
    fontSize: 13,
  },
});
