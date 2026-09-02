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
import { listCommonAreas } from "../../src/api/sites";
import { createFacilityReservation, listFacilityReservations } from "../../src/api/reservation";
import type { CommonArea } from "../../src/types/site";
import type { FacilityReservation } from "../../src/types/reservation";
import { useResident } from "../../src/auth/ResidentContext";

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  iptal: "İptal",
  tamamlandi: "Tamamlandı",
};
const STATUS_TONE: Record<string, "default" | "info" | "success" | "warning" | "error"> = {
  bekliyor: "warning",
  onaylandi: "success",
  reddedildi: "error",
  iptal: "default",
  tamamlandi: "info",
};

function toIso(local: string) {
  return new Date(local.includes("T") ? local : local.replace(" ", "T")).toISOString();
}

export default function ResidentReservationsScreen() {
  const { activeResidency } = useResident();
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [areaId, setAreaId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  async function refresh() {
    try {
      const [res, areas] = await Promise.all([listFacilityReservations(activeResidency.siteId), listCommonAreas(activeResidency.siteId)]);
      setReservations(res.filter((r) => r.unitId === activeResidency.unitId));
      setCommonAreas(areas);
      if (areas.length > 0 && !areaId) setAreaId(areas[0].id);
      setError(null);
    } catch {
      setError("Rezervasyonlar yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [activeResidency.siteId, activeResidency.unitId]));

  function areaName(id: string) {
    return commonAreas.find((a) => a.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreate() {
    if (!areaId || !start || !end) {
      setError("Ortak alan, başlangıç ve bitiş zorunlu");
      return;
    }
    setSubmitting(true);
    try {
      await createFacilityReservation(activeResidency.siteId, {
        commonAreaId: areaId,
        startTime: toIso(start),
        endTime: toIso(end),
      });
      setDialogOpen(false);
      setStart("");
      setEnd("");
      await refresh();
    } catch {
      setError("Rezervasyon oluşturulamadı — seçilen alan bu aralıkta dolu olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Rezervasyonlarım"
      action={<AppButton small label="Yeni Rezervasyon" onPress={() => setDialogOpen(true)} disabled={commonAreas.length === 0} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {commonAreas.length === 0 ? (
        <EmptyState text="Sitede henüz rezerve edilebilir ortak alan tanımlanmamış." />
      ) : reservations.length === 0 ? (
        <EmptyState text="Henüz rezervasyonunuz yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {reservations.map((r) => (
            <ListRow
              key={r.id}
              title={areaName(r.commonAreaId)}
              subtitle={`${new Date(r.startTime).toLocaleString("tr-TR")} — ${new Date(r.endTime).toLocaleString("tr-TR")}`}
              right={<Chip label={RESERVATION_STATUS_LABELS[r.status] ?? r.status} tone={STATUS_TONE[r.status] ?? "default"} />}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Rezervasyon" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <SelectField
          label="Ortak Alan"
          value={areaId}
          onChange={setAreaId}
          options={commonAreas.map((a) => ({ value: a.id, label: a.name }))}
        />
        <FormField label="Başlangıç" placeholder="2026-09-05T14:00" helperText="Format: YYYY-AA-GGTSS:DD" value={start} onChangeText={setStart} />
        <FormField label="Bitiş" placeholder="2026-09-05T16:00" helperText="Format: YYYY-AA-GGTSS:DD" value={end} onChangeText={setEnd} />
      </FormSheet>
    </Screen>
  );
}
