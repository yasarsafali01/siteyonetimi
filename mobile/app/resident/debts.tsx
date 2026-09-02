import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Screen } from "../../src/components/ui/Screen";
import { Card } from "../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../src/components/ui/ListRow";
import { colors } from "../../src/theme";
import { getPersonBalance, listChargesForUnit } from "../../src/api/finance";
import type { ChargeWithBalance, UnitBalance } from "../../src/types/finance";
import { useResident } from "../../src/auth/ResidentContext";

const CHARGE_TYPE_LABELS: Record<string, string> = {
  aidat: "Aidat",
  ek_aidat: "Ek Aidat",
  ozel_gider: "Özel Gider",
  gecikme_faizi: "Gecikme Faizi",
  gecikme_tazminati: "Gecikme Tazminatı",
};

export default function ResidentDebtsScreen() {
  const { me, activeResidency } = useResident();
  const [balance, setBalance] = useState<UnitBalance | null>(null);
  const [charges, setCharges] = useState<ChargeWithBalance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    try {
      const [bal, chg] = await Promise.all([getPersonBalance(me.personId!), listChargesForUnit(activeResidency.unitId)]);
      setBalance(bal);
      setCharges(chg);
      setError(null);
    } catch {
      setError("Borç bilgileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [activeResidency.unitId]));

  return (
    <Screen title="Borçlarım" error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      <Card style={{ marginBottom: 16, alignSelf: "flex-start", minWidth: 180 }}>
        <Text style={styles.balanceLabel}>Kalan Bakiye</Text>
        <Text style={[styles.balanceValue, { color: balance && balance.remainingAmount > 0 ? colors.warning : colors.success }]}>
          {(balance?.remainingAmount ?? 0).toLocaleString("tr-TR")} ₺
        </Text>
      </Card>

      {charges.length === 0 ? (
        <EmptyState text="Borç kaydınız yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {charges.map((c) => (
            <ListRow
              key={c.id}
              title={CHARGE_TYPE_LABELS[c.type] ?? c.type}
              subtitle={`${c.period ?? "-"} · Tutar ${c.amount.toLocaleString("tr-TR")} ₺ · Kalan ${c.remainingAmount.toLocaleString("tr-TR")} ₺`}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceLabel: { fontSize: 12, color: colors.textSecondary },
  balanceValue: { fontSize: 22, fontWeight: "700", marginTop: 2 },
});
