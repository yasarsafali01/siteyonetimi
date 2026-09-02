import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { StatCard } from "../../../src/components/ui/StatCard";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { SelectField } from "../../../src/components/ui/SelectField";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { IncomeExpenseChart } from "../../../src/components/ui/IncomeExpenseChart";
import { colors } from "../../../src/theme";
import { addManager, createBlock, createCommonArea, listBlocks, listCommonAreas, listManagers, removeManager } from "../../../src/api/sites";
import { getDashboard } from "../../../src/api/reporting";
import { getMonthlyIncomeExpense } from "../../../src/api/accounting";
import { listUsers } from "../../../src/api/users";
import type { Block, CommonArea, SiteManager } from "../../../src/types/site";
import type { Dashboard } from "../../../src/types/reporting";
import type { MonthlyIncomeExpense } from "../../../src/types/accounting";
import type { AppUser } from "../../../src/types/user";

function formatCurrency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function SiteOverviewScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const router = useRouter();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [monthly, setMonthly] = useState<MonthlyIncomeExpense[]>([]);
  const [managers, setManagers] = useState<SiteManager[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<AppUser[]>([]);
  const [newManagerId, setNewManagerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [floorCount, setFloorCount] = useState("");

  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    if (!siteId) return;
    try {
      const [blockData, areaData, dash, monthlyData, managerData, userData] = await Promise.all([
        listBlocks(siteId),
        listCommonAreas(siteId),
        getDashboard(siteId),
        getMonthlyIncomeExpense(siteId, 6),
        listManagers(siteId),
        listUsers(),
      ]);
      setBlocks(blockData);
      setAreas(areaData);
      setDashboard(dash);
      setMonthly(monthlyData);
      setManagers(managerData);
      setEligibleUsers(userData.filter((u) => u.userType === "yonetici" && !u.isSuperAdmin));
      setError(null);
    } catch {
      setError("Site bilgileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAddManager() {
    if (!siteId || !newManagerId) return;
    try {
      await addManager(siteId, newManagerId);
      setNewManagerId("");
      await refresh();
    } catch {
      setError("Yönetici atanamadı");
    }
  }

  async function handleRemoveManager(userId: string) {
    if (!siteId) return;
    try {
      await removeManager(siteId, userId);
      await refresh();
    } catch {
      setError("Yönetici kaldırılamadı");
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleCreateBlock() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createBlock(siteId, { name: blockName, floorCount: floorCount ? Number(floorCount) : undefined });
      setBlockDialogOpen(false);
      setBlockName("");
      setFloorCount("");
      await refresh();
    } catch {
      setError("Blok oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateArea() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createCommonArea(siteId, { name: areaName, areaSqm: areaSqm ? Number(areaSqm) : undefined });
      setAreaDialogOpen(false);
      setAreaName("");
      setAreaSqm("");
      await refresh();
    } catch {
      setError("Ortak alan oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      {dashboard && (
        <View style={styles.statGrid}>
          <StatCard icon="wallet-outline" label="Açık Borç" value={formatCurrency(dashboard.totalOutstandingDebt)} tone="warning" />
          <StatCard icon="trending-up-outline" label="Bu Ay Tahsilat" value={formatCurrency(dashboard.collectedThisMonth)} tone="success" />
          <StatCard icon="build-outline" label="Açık Talep" value={String(dashboard.openRequests)} tone="info" />
          <StatCard icon="calendar-outline" label="Bekleyen Rezervasyon" value={String(dashboard.pendingReservations)} tone="primary" />
        </View>
      )}

      <Card style={{ marginBottom: 20 }}>
        <Text style={styles.sectionTitle}>Gelir / Gider (Son 6 Ay)</Text>
        <IncomeExpenseChart data={monthly} />
      </Card>

      <Text style={styles.sectionTitle}>Site Yöneticileri</Text>
      {managers.length === 0 ? (
        <EmptyState text="Bu siteye atanmış yönetici yok — süper admin dışında kimse bu siteyi göremez." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 12 }}>
          {managers.map((m) => (
            <ListRow
              key={m.userId}
              title={m.fullName}
              subtitle={m.email}
              right={<AppButton small variant="text" color="error" label="Kaldır" onPress={() => handleRemoveManager(m.userId)} />}
            />
          ))}
        </Card>
      )}
      {eligibleUsers.filter((u) => !managers.some((m) => m.userId === u.id)).length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <SelectField
            label="Yönetici Ata"
            value={newManagerId}
            onChange={setNewManagerId}
            options={eligibleUsers
              .filter((u) => !managers.some((m) => m.userId === u.id))
              .map((u) => ({ value: u.id, label: `${u.fullName} (${u.email})` }))}
          />
          <AppButton small variant="outlined" label="Ata" onPress={handleAddManager} disabled={!newManagerId} />
        </View>
      )}

      <View style={styles.rowHeader}>
        <Text style={styles.sectionTitle}>Bloklar</Text>
        <AppButton small label="Yeni Blok" onPress={() => setBlockDialogOpen(true)} />
      </View>
      {blocks.length === 0 ? (
        <EmptyState text="Henüz blok eklenmedi." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 20 }}>
          {blocks.map((b) => (
            <ListRow
              key={b.id}
              title={b.name}
              subtitle={b.floorCount ? `${b.floorCount} kat` : undefined}
              onPress={() => router.push(`/site/${siteId}/blocks/${b.id}` as never)}
            />
          ))}
        </Card>
      )}

      <View style={styles.rowHeader}>
        <Text style={styles.sectionTitle}>Ortak Alanlar</Text>
        <AppButton small label="Yeni Ortak Alan" onPress={() => setAreaDialogOpen(true)} />
      </View>
      {areas.length === 0 ? (
        <EmptyState text="Henüz ortak alan eklenmedi." />
      ) : (
        <Card style={{ padding: 0 }}>
          {areas.map((a) => (
            <ListRow key={a.id} title={a.name} subtitle={a.areaSqm ? `${a.areaSqm} m²` : undefined} />
          ))}
        </Card>
      )}

      <FormSheet visible={blockDialogOpen} title="Yeni Blok" onClose={() => setBlockDialogOpen(false)} onSubmit={handleCreateBlock} submitting={submitting}>
        <FormField label="Blok Adı" value={blockName} onChangeText={setBlockName} autoFocus />
        <FormField label="Kat Sayısı" value={floorCount} onChangeText={setFloorCount} keyboardType="numeric" />
      </FormSheet>

      <FormSheet visible={areaDialogOpen} title="Yeni Ortak Alan" onClose={() => setAreaDialogOpen(false)} onSubmit={handleCreateArea} submitting={submitting}>
        <FormField label="Alan Adı" value={areaName} onChangeText={setAreaName} autoFocus />
        <FormField label="Metrekare" value={areaSqm} onChangeText={setAreaSqm} keyboardType="numeric" />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 10,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
});
