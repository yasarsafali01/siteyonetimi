import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { StatCard } from "../../../src/components/ui/StatCard";
import { colors, radius } from "../../../src/theme";
import { getCollectionRate, getDashboard, getDebtors } from "../../../src/api/reporting";
import type { CollectionRatePeriod, Dashboard, Debtor } from "../../../src/types/reporting";

function formatCurrency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function ReportingScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [collectionRate, setCollectionRate] = useState<CollectionRatePeriod[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (!siteId) return;
    try {
      const [d, cr, db] = await Promise.all([getDashboard(siteId), getCollectionRate(siteId, 6), getDebtors(siteId)]);
      setDashboard(d);
      setCollectionRate(cr);
      setDebtors(db);
      setError(null);
    } catch {
      setError("Rapor verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  const maxCharged = Math.max(1, ...collectionRate.map((p) => p.charged));

  return (
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      {dashboard && (
        <View style={styles.statGrid}>
          <StatCard icon="business-outline" label="Bağımsız Bölüm" value={String(dashboard.totalUnits)} />
          <StatCard icon="wallet-outline" label="Açık Borç" value={formatCurrency(dashboard.totalOutstandingDebt)} tone="warning" />
          <StatCard icon="trending-up-outline" label="Bu Ay Tahakkuk" value={formatCurrency(dashboard.chargedThisMonth)} tone="info" />
          <StatCard icon="cash-outline" label="Bu Ay Tahsilat" value={formatCurrency(dashboard.collectedThisMonth)} tone="success" />
          <StatCard icon="build-outline" label="Açık Talep" value={String(dashboard.openRequests)} tone="info" />
          <StatCard icon="calendar-outline" label="Bekleyen Rezervasyon" value={String(dashboard.pendingReservations)} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Tahsilat Oranı (Son 6 Ay)</Text>
      <View style={{ gap: 12, marginBottom: 20 }}>
        {collectionRate.map((p) => (
          <View key={p.period}>
            <View style={styles.periodRow}>
              <Text style={styles.periodLabel}>{p.period}</Text>
              <Text style={styles.periodValue}>{formatCurrency(p.collected)} / {formatCurrency(p.charged)} (%{p.ratePct.toFixed(0)})</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barCharged, { width: `${(p.charged / maxCharged) * 100}%` }]} />
              <View style={[styles.barCollected, { width: `${(p.collected / maxCharged) * 100}%` }]} />
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Borçlu Listesi</Text>
      {debtors.length === 0 ? (
        <EmptyState text="Borçlu bağımsız bölüm yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {debtors.map((d) => (
            <ListRow
              key={d.unitId}
              title={`${d.blockName} — ${d.unitNumber}`}
              subtitle={`Tahakkuk ${formatCurrency(d.totalCharged)} · Tahsilat ${formatCurrency(d.totalPaid)}`}
              right={<Text style={styles.debtValue}>{formatCurrency(d.remainingAmount)}</Text>}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 10 },
  periodRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  periodLabel: { fontSize: 13, color: colors.textPrimary },
  periodValue: { fontSize: 12, color: colors.textSecondary },
  barTrack: { position: "relative", height: 10, backgroundColor: "#f1f5f9", borderRadius: radius.sm, overflow: "hidden" },
  barCharged: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.warningLight },
  barCollected: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.success },
  debtValue: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
});
