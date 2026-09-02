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
import {
  createCargoDelivery,
  deliverToResident,
  listCargoDeliveries,
  markCargoReturned,
  notifyCargoRecipient,
} from "../../../src/api/cargo";
import type { CargoDelivery, CargoStatus } from "../../../src/types/cargo";

const STATUS_LABELS: Record<CargoStatus, string> = {
  teslim_alindi: "Teslim Alındı",
  sakine_teslim_edildi: "Sakine Teslim Edildi",
  iade: "İade",
};
const STATUS_TONE: Record<CargoStatus, "warning" | "success" | "default"> = {
  teslim_alindi: "warning",
  sakine_teslim_edildi: "success",
  iade: "default",
};

export default function CargoScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [deliveries, setDeliveries] = useState<CargoDelivery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [courierCompany, setCourierCompany] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [description, setDescription] = useState("");

  const [deliverTarget, setDeliverTarget] = useState<CargoDelivery | null>(null);
  const [deliveredTo, setDeliveredTo] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      setDeliveries(await listCargoDeliveries(siteId));
      setError(null);
    } catch {
      setError("Kargo verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleCreate() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createCargoDelivery(siteId, {
        courierCompany: courierCompany || undefined,
        trackingNo: trackingNo || undefined,
        description: description || undefined,
      });
      setDialogOpen(false);
      setCourierCompany("");
      setTrackingNo("");
      setDescription("");
      await refresh();
    } catch {
      setError("Kargo kaydı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeliver() {
    if (!deliverTarget) return;
    setSubmitting(true);
    try {
      await deliverToResident(deliverTarget.id, deliveredTo);
      setDeliverTarget(null);
      setDeliveredTo("");
      await refresh();
    } catch {
      setError("Teslim işlemi kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn(id: string) {
    try {
      await markCargoReturned(id);
      await refresh();
    } catch {
      setError("İade işaretlenemedi");
    }
  }

  async function handleNotify(id: string) {
    try {
      await notifyCargoRecipient(id);
      await refresh();
    } catch {
      setError("Bildirim gönderilemedi");
    }
  }

  return (
    <Screen
      title="Kargo Kayıtları"
      action={<AppButton small label="Kargo Kabul" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {deliveries.length === 0 ? (
        <EmptyState text="Henüz kargo kaydı yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {deliveries.map((d) => (
            <View key={d.id}>
              <ListRow
                title={d.courierCompany ?? "Kargo"}
                subtitle={`${d.trackingNo ?? "-"} · ${new Date(d.receivedAt).toLocaleString("tr-TR")}${d.notifiedAt ? " · Bildirildi" : ""}`}
                right={<Chip label={STATUS_LABELS[d.status]} tone={STATUS_TONE[d.status]} />}
              />
              {d.status === "teslim_alindi" && (
                <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 4 }}>
                  {!d.notifiedAt && <AppButton small variant="text" label="Bildir" onPress={() => handleNotify(d.id)} />}
                  <AppButton small variant="text" color="success" label="Teslim Et" onPress={() => { setDeliverTarget(d); setDeliveredTo(""); }} />
                  <AppButton small variant="text" color="error" label="İade" onPress={() => handleReturn(d.id)} />
                </View>
              )}
            </View>
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Kargo Kabul" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <FormField label="Kargo Firması" value={courierCompany} onChangeText={setCourierCompany} autoFocus />
        <FormField label="Takip No / Barkod" value={trackingNo} onChangeText={setTrackingNo} />
        <FormField label="Açıklama" value={description} onChangeText={setDescription} />
      </FormSheet>

      <FormSheet visible={Boolean(deliverTarget)} title="Sakine Teslim Et" onClose={() => setDeliverTarget(null)} onSubmit={handleDeliver} submitting={submitting}>
        <FormField label="Teslim Alan" value={deliveredTo} onChangeText={setDeliveredTo} autoFocus />
      </FormSheet>
    </Screen>
  );
}
