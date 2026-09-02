import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../src/components/ui/Screen";
import { StatCard } from "../../src/components/ui/StatCard";
import { Chip } from "../../src/components/ui/Chip";
import { FormSheet } from "../../src/components/ui/FormSheet";
import { ListRow } from "../../src/components/ui/ListRow";
import { colors } from "../../src/theme";
import { getPersonBalance } from "../../src/api/finance";
import { listRequests } from "../../src/api/request";
import { listFacilityReservations } from "../../src/api/reservation";
import { listInvitations } from "../../src/api/visitor";
import { useResident } from "../../src/auth/ResidentContext";

function formatCurrency(n: number) {
  return `${n.toLocaleString("tr-TR")} ₺`;
}

export default function ResidentOverviewScreen() {
  const { me, activeResidency, setActiveResidency } = useResident();
  const router = useRouter();

  const [balance, setBalance] = useState(0);
  const [openRequests, setOpenRequests] = useState(0);
  const [upcomingReservations, setUpcomingReservations] = useState(0);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  async function refresh() {
    try {
      const [bal, reqs, res, invs] = await Promise.all([
        getPersonBalance(me.personId!),
        listRequests(activeResidency.siteId),
        listFacilityReservations(activeResidency.siteId),
        listInvitations(activeResidency.siteId),
      ]);
      setBalance(bal.remainingAmount);
      setOpenRequests(reqs.filter((r) => r.status !== "cozuldu" && r.status !== "kapatildi").length);
      setUpcomingReservations(
        res.filter((r) => r.unitId === activeResidency.unitId && r.status === "onaylandi" && new Date(r.startTime) > new Date()).length,
      );
      setPendingInvitations(invs.filter((i) => i.status === "bekliyor" || i.status === "onaylandi").length);
      setError(null);
    } catch {
      setError("Veriler yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [activeResidency.unitId]));

  return (
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      <View style={styles.greetingRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Merhaba, {me.fullName.split(" ")[0]}</Text>
          <Text style={styles.residencyLine}>
            {activeResidency.siteName} — {activeResidency.blockName} / {activeResidency.unitNumber}
          </Text>
        </View>
        <Chip label={activeResidency.relation === "malik" ? "Malik" : "Kiracı"} tone="primary" />
      </View>

      {me.residencies && me.residencies.length > 1 && (
        <Pressable style={styles.switcher} onPress={() => setSwitcherOpen(true)}>
          <Text style={styles.switcherText}>Bağımsız bölüm değiştir</Text>
        </Pressable>
      )}

      <View style={styles.statGrid}>
        <Pressable style={{ flexGrow: 1, flexBasis: "45%" }} onPress={() => router.push("/resident/debts")}>
          <StatCard icon="wallet-outline" label="Kalan Bakiye" value={formatCurrency(balance)} tone={balance > 0 ? "warning" : "success"} />
        </Pressable>
        <Pressable style={{ flexGrow: 1, flexBasis: "45%" }} onPress={() => router.push("/resident/requests")}>
          <StatCard icon="build-outline" label="Açık Talep" value={String(openRequests)} tone="info" />
        </Pressable>
        <Pressable style={{ flexGrow: 1, flexBasis: "45%" }} onPress={() => router.push("/resident/reservations")}>
          <StatCard icon="calendar-outline" label="Yaklaşan Rezervasyon" value={String(upcomingReservations)} tone="primary" />
        </Pressable>
        <Pressable style={{ flexGrow: 1, flexBasis: "45%" }} onPress={() => router.push("/resident/invitations")}>
          <StatCard icon="person-add-outline" label="Aktif Davetiye" value={String(pendingInvitations)} tone="primary" />
        </Pressable>
      </View>

      <FormSheet visible={switcherOpen} title="Bağımsız Bölüm Seç" onClose={() => setSwitcherOpen(false)} onSubmit={() => setSwitcherOpen(false)} submitLabel="Kapat">
        {me.residencies?.map((r) => (
          <ListRow
            key={r.unitId}
            title={`${r.siteName} — ${r.blockName} / ${r.unitNumber}`}
            subtitle={r.relation === "malik" ? "Malik" : "Kiracı"}
            onPress={() => { setActiveResidency(r); setSwitcherOpen(false); }}
          />
        ))}
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greetingRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12, gap: 10 },
  greeting: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  residencyLine: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  switcher: { marginBottom: 16 },
  switcherText: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
