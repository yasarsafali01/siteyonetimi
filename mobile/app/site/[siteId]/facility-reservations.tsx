import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { Chip } from "../../../src/components/ui/Chip";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { SelectField } from "../../../src/components/ui/SelectField";
import { listCommonAreas } from "../../../src/api/sites";
import {
  cancelFacilityReservation,
  createFacilityReservation,
  decideFacilityReservation,
  listFacilityReservations,
} from "../../../src/api/reservation";
import type { CommonArea } from "../../../src/types/site";
import type { FacilityReservation, FacilityReservationStatus } from "../../../src/types/reservation";

const STATUS_LABELS: Record<FacilityReservationStatus, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  iptal: "İptal",
  tamamlandi: "Tamamlandı",
};
const STATUS_TONE: Record<FacilityReservationStatus, "warning" | "success" | "error" | "default"> = {
  bekliyor: "warning",
  onaylandi: "success",
  reddedildi: "error",
  iptal: "default",
  tamamlandi: "default",
};

function toIso(local: string) {
  return new Date(local.includes("T") ? local : local.replace(" ", "T")).toISOString();
}

export default function FacilityReservationsScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [areaId, setAreaId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");

  function areaName(id: string) {
    return areas.find((a) => a.id === id)?.name ?? id.slice(0, 8);
  }

  async function refresh() {
    if (!siteId) return;
    try {
      const [a, r] = await Promise.all([listCommonAreas(siteId), listFacilityReservations(siteId)]);
      setAreas(a);
      setReservations(r);
      if (a.length > 0 && !areaId) setAreaId(a[0].id);
      setError(null);
    } catch {
      setError("Rezervasyon verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleCreate() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createFacilityReservation(siteId, {
        commonAreaId: areaId,
        startTime: toIso(startTime),
        endTime: toIso(endTime),
        note: note || undefined,
      });
      setDialogOpen(false);
      setNote("");
      await refresh();
    } catch {
      setError("Rezervasyon oluşturulamadı — seçilen alan bu aralıkta dolu olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecide(id: string, approve: boolean) {
    try {
      await decideFacilityReservation(id, approve);
      await refresh();
    } catch {
      setError("Rezervasyon güncellenemedi");
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelFacilityReservation(id);
      await refresh();
    } catch {
      setError("Rezervasyon iptal edilemedi");
    }
  }

  return (
    <Screen
      title="Sosyal Tesis Rezervasyonları"
      action={<AppButton small label="Yeni Rezervasyon" onPress={() => setDialogOpen(true)} disabled={areas.length === 0} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {areas.length === 0 && <EmptyState text="Rezervasyon açabilmek için önce ortak alan (havuz, spor salonu vb.) ekleyin." />}
      {reservations.length === 0 ? (
        <EmptyState text="Henüz rezervasyon yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {reservations.map((r) => (
            <View key={r.id}>
              <ListRow
                title={areaName(r.commonAreaId)}
                subtitle={`${new Date(r.startTime).toLocaleString("tr-TR")} — ${new Date(r.endTime).toLocaleString("tr-TR")}`}
                right={<Chip label={STATUS_LABELS[r.status]} tone={STATUS_TONE[r.status]} />}
              />
              <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 4 }}>
                {r.status === "bekliyor" && (
                  <>
                    <AppButton small variant="text" color="success" label="Onayla" onPress={() => handleDecide(r.id, true)} />
                    <AppButton small variant="text" color="error" label="Reddet" onPress={() => handleDecide(r.id, false)} />
                  </>
                )}
                {(r.status === "bekliyor" || r.status === "onaylandi") && (
                  <AppButton small variant="text" label="İptal Et" onPress={() => handleCancel(r.id)} />
                )}
              </View>
            </View>
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Rezervasyon" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <SelectField label="Ortak Alan" value={areaId} onChange={setAreaId} options={areas.map((a) => ({ value: a.id, label: a.name }))} />
        <FormField label="Başlangıç" placeholder="2026-09-05T14:00" helperText="Format: YYYY-AA-GGTSS:DD" value={startTime} onChangeText={setStartTime} />
        <FormField label="Bitiş" placeholder="2026-09-05T16:00" helperText="Format: YYYY-AA-GGTSS:DD" value={endTime} onChangeText={setEndTime} />
        <FormField label="Not" value={note} onChangeText={setNote} />
      </FormSheet>
    </Screen>
  );
}
