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
  cancelParkingReservation,
  checkInVehicle,
  checkOutVehicle,
  createParkingReservation,
  createParkingSpot,
  listParkingReservations,
  listParkingSpots,
  listVehicleRecords,
} from "../../../src/api/parking";
import type { ParkingOwnerType, ParkingReservation, ParkingSpot, ParkingSpotType, ParkingVehicleRecord } from "../../../src/types/parking";

const SPOT_TYPE_LABELS: Record<ParkingSpotType, string> = { sakin: "Sakin", misafir: "Misafir", engelli: "Engelli" };

function toIso(local: string) {
  return new Date(local.includes("T") ? local : local.replace(" ", "T")).toISOString();
}

export default function ParkingScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [records, setRecords] = useState<ParkingVehicleRecord[]>([]);
  const [reservations, setReservations] = useState<ParkingReservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [spotDialogOpen, setSpotDialogOpen] = useState(false);
  const [spotNumber, setSpotNumber] = useState("");
  const [spotType, setSpotType] = useState<ParkingSpotType>("sakin");

  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [ownerType, setOwnerType] = useState<ParkingOwnerType>("sakin");
  const [checkInSpotId, setCheckInSpotId] = useState("");

  const [resDialogOpen, setResDialogOpen] = useState(false);
  const [resSpotId, setResSpotId] = useState("");
  const [resStart, setResStart] = useState("");
  const [resEnd, setResEnd] = useState("");

  function spotLabel(id: string | null) {
    if (!id) return "-";
    return spots.find((s) => s.id === id)?.spotNumber ?? id.slice(0, 8);
  }

  async function refresh() {
    if (!siteId) return;
    try {
      const [sp, rec, res] = await Promise.all([listParkingSpots(siteId), listVehicleRecords(siteId), listParkingReservations(siteId)]);
      setSpots(sp);
      setRecords(rec);
      setReservations(res);
      setError(null);
    } catch {
      setError("Otopark verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleCreateSpot() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createParkingSpot(siteId, { spotNumber, spotType });
      setSpotDialogOpen(false);
      setSpotNumber("");
      await refresh();
    } catch {
      setError("Park alanı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckIn() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await checkInVehicle(siteId, { plate, ownerType, spotId: checkInSpotId || undefined });
      setCheckInDialogOpen(false);
      setPlate("");
      setCheckInSpotId("");
      await refresh();
    } catch {
      setError("Araç girişi kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut(id: string) {
    try {
      await checkOutVehicle(id);
      await refresh();
    } catch {
      setError("Araç çıkışı kaydedilemedi");
    }
  }

  async function handleCreateReservation() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createParkingReservation(siteId, { spotId: resSpotId, startTime: toIso(resStart), endTime: toIso(resEnd) });
      setResDialogOpen(false);
      setResSpotId("");
      await refresh();
    } catch {
      setError("Rezervasyon oluşturulamadı — seçilen alan bu aralıkta dolu olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelReservation(id: string) {
    try {
      await cancelParkingReservation(id);
      await refresh();
    } catch {
      setError("Rezervasyon iptal edilemedi");
    }
  }

  return (
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Park Alanları</Text>
        <AppButton small label="Yeni Alan" onPress={() => setSpotDialogOpen(true)} />
      </View>
      {spots.length === 0 ? (
        <EmptyState text="Henüz park alanı yok." />
      ) : (
        <View style={styles.chipRow}>
          {spots.map((s) => <Chip key={s.id} label={`${s.spotNumber} (${SPOT_TYPE_LABELS[s.spotType]})`} />)}
        </View>
      )}

      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Araç Kayıtları</Text>
        <AppButton small label="Araç Girişi" onPress={() => setCheckInDialogOpen(true)} />
      </View>
      {records.length === 0 ? (
        <EmptyState text="Kayıt bulunamadı." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 20 }}>
          {records.map((r) => (
            <ListRow
              key={r.id}
              title={r.plate}
              subtitle={`${r.ownerType === "sakin" ? "Sakin" : "Misafir"} · ${spotLabel(r.spotId)} · Giriş: ${new Date(r.enteredAt).toLocaleString("tr-TR")}`}
              right={!r.exitedAt ? <AppButton small variant="outlined" label="Çıkış Yap" onPress={() => handleCheckOut(r.id)} /> : undefined}
            />
          ))}
        </Card>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Park Rezervasyonları</Text>
        <AppButton small label="Yeni Rezervasyon" onPress={() => setResDialogOpen(true)} disabled={spots.length === 0} />
      </View>
      {reservations.length === 0 ? (
        <EmptyState text="Henüz rezervasyon yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {reservations.map((r) => (
            <ListRow
              key={r.id}
              title={spotLabel(r.spotId)}
              subtitle={`${new Date(r.startTime).toLocaleString("tr-TR")} — ${new Date(r.endTime).toLocaleString("tr-TR")}`}
              right={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Chip label={r.status} tone={r.status === "aktif" ? "success" : "default"} />
                  {r.status === "aktif" && <AppButton small variant="text" color="error" label="İptal" onPress={() => handleCancelReservation(r.id)} />}
                </View>
              }
            />
          ))}
        </Card>
      )}

      <FormSheet visible={spotDialogOpen} title="Yeni Park Alanı" onClose={() => setSpotDialogOpen(false)} onSubmit={handleCreateSpot} submitting={submitting}>
        <FormField label="Alan No" value={spotNumber} onChangeText={setSpotNumber} autoFocus />
        <SelectField label="Tür" value={spotType} onChange={(v) => setSpotType(v as ParkingSpotType)} options={Object.entries(SPOT_TYPE_LABELS).map(([value, label]) => ({ value, label }))} />
      </FormSheet>

      <FormSheet visible={checkInDialogOpen} title="Araç Girişi" onClose={() => setCheckInDialogOpen(false)} onSubmit={handleCheckIn} submitting={submitting}>
        <FormField label="Plaka" value={plate} onChangeText={setPlate} autoFocus />
        <SelectField label="Sahip Türü" value={ownerType} onChange={(v) => setOwnerType(v as ParkingOwnerType)} options={[{ value: "sakin", label: "Sakin" }, { value: "misafir", label: "Misafir" }]} />
        <SelectField label="Park Alanı (opsiyonel)" value={checkInSpotId} onChange={setCheckInSpotId} options={[{ value: "", label: "Seçilmedi" }, ...spots.map((s) => ({ value: s.id, label: s.spotNumber }))]} />
      </FormSheet>

      <FormSheet visible={resDialogOpen} title="Yeni Park Rezervasyonu" onClose={() => setResDialogOpen(false)} onSubmit={handleCreateReservation} submitting={submitting}>
        <SelectField label="Park Alanı" value={resSpotId} onChange={setResSpotId} options={spots.map((s) => ({ value: s.id, label: s.spotNumber }))} />
        <FormField label="Başlangıç" placeholder="2026-09-05T14:00" helperText="Format: YYYY-AA-GGTSS:DD" value={resStart} onChangeText={setResStart} />
        <FormField label="Bitiş" placeholder="2026-09-05T16:00" helperText="Format: YYYY-AA-GGTSS:DD" value={resEnd} onChangeText={setResEnd} />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
