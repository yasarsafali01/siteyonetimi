import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { Chip } from "../../../src/components/ui/Chip";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { SelectField } from "../../../src/components/ui/SelectField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { colors } from "../../../src/theme";
import {
  assignWorkOrder,
  completeWorkOrder,
  createFacility,
  createPlan,
  createWorkOrder,
  listDuePlans,
  listFacilities,
  listPlans,
  listWorkOrders,
} from "../../../src/api/maintenance";
import { getCurrentUserId } from "../../../src/api/client";
import type { Facility, FacilityType, MaintenancePlan, WorkOrder, WorkOrderStatus } from "../../../src/types/maintenance";

const FACILITY_TYPES: { value: FacilityType; label: string }[] = [
  { value: "asansor", label: "Asansör" },
  { value: "jenerator", label: "Jeneratör" },
  { value: "havuz", label: "Havuz" },
  { value: "yangin_sistemi", label: "Yangın Sistemi" },
  { value: "diger", label: "Diğer" },
];
const STATUS_LABELS: Record<WorkOrderStatus, string> = { planlandi: "Planlandı", devam_ediyor: "Devam Ediyor", tamamlandi: "Tamamlandı", iptal: "İptal" };
const STATUS_TONE: Record<WorkOrderStatus, "default" | "info" | "success" | "error"> = { planlandi: "default", devam_ediyor: "info", tamamlandi: "success", iptal: "error" };

export default function MaintenanceScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [duePlans, setDuePlans] = useState<MaintenancePlan[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [facType, setFacType] = useState<FacilityType>("asansor");
  const [facName, setFacName] = useState("");
  const [facLocation, setFacLocation] = useState("");

  const [planFacility, setPlanFacility] = useState<Facility | null>(null);
  const [facilityPlans, setFacilityPlans] = useState<MaintenancePlan[]>([]);
  const [planTitle, setPlanTitle] = useState("");
  const [planFrequency, setPlanFrequency] = useState("30");
  const [planNextDue, setPlanNextDue] = useState(new Date().toISOString().slice(0, 10));

  const [woDialogOpen, setWoDialogOpen] = useState(false);
  const [woFacilityId, setWoFacilityId] = useState("");
  const [woTitle, setWoTitle] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      const [f, dp, wo] = await Promise.all([listFacilities(siteId), listDuePlans(siteId), listWorkOrders(siteId)]);
      setFacilities(f);
      setDuePlans(dp);
      setWorkOrders(wo);
      setError(null);
    } catch {
      setError("Bakım verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  function facilityName(id: string | null) {
    if (!id) return "-";
    return facilities.find((f) => f.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreateFacility() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createFacility(siteId, { type: facType, name: facName, location: facLocation || undefined });
      setFacilityDialogOpen(false);
      setFacName("");
      setFacLocation("");
      await refresh();
    } catch {
      setError("Tesis varlığı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function openPlans(f: Facility) {
    setPlanFacility(f);
    setFacilityPlans(await listPlans(f.id));
  }

  async function handleCreatePlan() {
    if (!planFacility) return;
    setSubmitting(true);
    try {
      await createPlan(planFacility.id, { title: planTitle, frequencyDays: Number(planFrequency), nextDueDate: planNextDue });
      setPlanTitle("");
      setFacilityPlans(await listPlans(planFacility.id));
      await refresh();
    } catch {
      setError("Bakım planı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateWorkOrder() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createWorkOrder(siteId, { facilityId: woFacilityId || undefined, title: woTitle });
      setWoDialogOpen(false);
      setWoTitle("");
      await refresh();
    } catch {
      setError("İş emri oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignToMe(wo: WorkOrder) {
    const uid = await getCurrentUserId();
    if (!uid) return;
    try {
      await assignWorkOrder(wo.id, uid);
      await refresh();
    } catch {
      setError("Atama yapılamadı");
    }
  }

  async function handleComplete(wo: WorkOrder) {
    try {
      await completeWorkOrder(wo.id, "Tamamlandı");
      await refresh();
    } catch {
      setError("İş emri tamamlanamadı");
    }
  }

  return (
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      {duePlans.length > 0 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>{duePlans.length} bakım planının vadesi geldi: {duePlans.map((p) => p.title).join(", ")}</Text>
        </View>
      )}

      <View style={styles.rowHeader}>
        <Text style={styles.sectionTitle}>Tesis Varlıkları</Text>
        <AppButton small label="Yeni Tesis Varlığı" onPress={() => setFacilityDialogOpen(true)} />
      </View>
      {facilities.length === 0 ? (
        <EmptyState text="Henüz tesis varlığı eklenmedi." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 20 }}>
          {facilities.map((f) => (
            <ListRow
              key={f.id}
              title={f.name}
              subtitle={`${FACILITY_TYPES.find((t) => t.value === f.type)?.label} ${f.location ? `· ${f.location}` : ""}`}
              onPress={() => openPlans(f)}
            />
          ))}
        </Card>
      )}

      <View style={styles.rowHeader}>
        <Text style={styles.sectionTitle}>İş Emirleri</Text>
        <AppButton small label="Yeni İş Emri" onPress={() => setWoDialogOpen(true)} />
      </View>
      {workOrders.length === 0 ? (
        <EmptyState text="Henüz iş emri yok." />
      ) : (
        workOrders.map((wo) => (
          <Card key={wo.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontWeight: "700", flexShrink: 1 }}>{wo.title}</Text>
              <Chip label={STATUS_LABELS[wo.status]} tone={STATUS_TONE[wo.status]} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>{facilityName(wo.facilityId)}</Text>
            {wo.status !== "tamamlandi" && wo.status !== "iptal" && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                {!wo.assignedTo && <AppButton small variant="outlined" label="Bana Ata" onPress={() => handleAssignToMe(wo)} />}
                <AppButton small variant="outlined" label="Tamamla" onPress={() => handleComplete(wo)} />
              </View>
            )}
          </Card>
        ))
      )}

      <FormSheet visible={facilityDialogOpen} title="Yeni Tesis Varlığı" onClose={() => setFacilityDialogOpen(false)} onSubmit={handleCreateFacility} submitting={submitting}>
        <SelectField label="Tür" value={facType} onChange={(v) => setFacType(v as FacilityType)} options={FACILITY_TYPES} />
        <FormField label="Ad" value={facName} onChangeText={setFacName} autoFocus />
        <FormField label="Konum" value={facLocation} onChangeText={setFacLocation} />
      </FormSheet>

      <FormSheet visible={woDialogOpen} title="Yeni İş Emri" onClose={() => setWoDialogOpen(false)} onSubmit={handleCreateWorkOrder} submitting={submitting}>
        <SelectField
          label="Tesis (opsiyonel)"
          value={woFacilityId}
          onChange={setWoFacilityId}
          options={[{ label: "-", value: "" }, ...facilities.map((f) => ({ label: f.name, value: f.id }))]}
        />
        <FormField label="Başlık" value={woTitle} onChangeText={setWoTitle} />
      </FormSheet>

      <Modal visible={Boolean(planFacility)} animationType="slide" onRequestClose={() => setPlanFacility(null)}>
        <View style={styles.detailContainer}>
          <Screen title={`${planFacility?.name} — Bakım Planları`} action={<AppButton small variant="text" label="Kapat" onPress={() => setPlanFacility(null)} />}>
            {facilityPlans.length === 0 ? (
              <EmptyState text="Henüz plan yok." />
            ) : (
              facilityPlans.map((p) => (
                <Text key={p.id} style={{ fontSize: 13, marginBottom: 6, color: colors.textPrimary }}>
                  {p.title} — her {p.frequencyDays} günde bir — sıradaki: {new Date(p.nextDueDate).toLocaleDateString("tr-TR")}
                </Text>
              ))
            )}
            <View style={{ marginTop: 12 }}>
              <FormField label="Plan Başlığı" value={planTitle} onChangeText={setPlanTitle} />
              <FormField label="Sıklık (gün)" value={planFrequency} onChangeText={setPlanFrequency} keyboardType="numeric" />
              <FormField label="Sıradaki Vade (YYYY-MM-DD)" value={planNextDue} onChangeText={setPlanNextDue} />
              <AppButton label="Plan Ekle" variant="outlined" onPress={handleCreatePlan} loading={submitting} />
            </View>
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
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  warningBox: {
    backgroundColor: colors.warningLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: "#92400e",
    fontSize: 13,
  },
});
