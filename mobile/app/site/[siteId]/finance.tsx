import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { Chip } from "../../../src/components/ui/Chip";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { SelectField } from "../../../src/components/ui/SelectField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { EmptyState } from "../../../src/components/ui/ListRow";
import { colors } from "../../../src/theme";
import { bulkGenerateDues, createPayment, listChargesForSite } from "../../../src/api/finance";
import { listBlocks, listUnits } from "../../../src/api/sites";
import type { ChargeWithBalance, PaymentMethod } from "../../../src/types/finance";

const CHARGE_TYPE_LABELS: Record<string, string> = {
  aidat: "Aidat",
  ek_aidat: "Ek Aidat",
  ozel_gider: "Özel Gider",
  gecikme_faizi: "Gecikme Faizi",
  gecikme_tazminati: "Gecikme Tazminatı",
};

export default function FinanceScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [charges, setCharges] = useState<ChargeWithBalance[]>([]);
  const [unitLabels, setUnitLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [period, setPeriod] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [baseAmount, setBaseAmount] = useState("");

  const [payingCharge, setPayingCharge] = useState<ChargeWithBalance | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("nakit");

  async function refresh() {
    if (!siteId) return;
    try {
      const [chargeData, blocks] = await Promise.all([listChargesForSite(siteId), listBlocks(siteId)]);
      setCharges(chargeData);
      const labels: Record<string, string> = {};
      for (const block of blocks) {
        const units = await listUnits(block.id);
        for (const unit of units) {
          labels[unit.id] = `${block.name} / ${unit.unitNumber}`;
        }
      }
      setUnitLabels(labels);
      setError(null);
    } catch {
      setError("Finans bilgileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleGenerate() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await bulkGenerateDues(siteId, { period, dueDate: new Date(dueDate).toISOString(), baseAmount: Number(baseAmount) });
      setGenDialogOpen(false);
      setPeriod("");
      setDueDate("");
      setBaseAmount("");
      await refresh();
    } catch {
      setError("Aidat üretilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    if (!payingCharge) return;
    setSubmitting(true);
    try {
      await createPayment(payingCharge.id, { amount: Number(payAmount), method: payMethod });
      setPayingCharge(null);
      setPayAmount("");
      await refresh();
    } catch {
      setError("Ödeme kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  const totalRemaining = charges.reduce((sum, c) => sum + c.remainingAmount, 0);

  return (
    <Screen
      title="Borç / Tahsilat Listesi"
      action={<AppButton small label="Aidat Üret" onPress={() => setGenDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      <Card style={{ marginBottom: 16, alignSelf: "flex-start" }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Toplam Kalan Bakiye</Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary }}>{totalRemaining.toLocaleString("tr-TR")} ₺</Text>
      </Card>

      {charges.length === 0 ? (
        <EmptyState text="Henüz borç kaydı yok." />
      ) : (
        charges.map((c) => (
          <Card key={c.id} style={styles.chargeCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.unitLabel}>{unitLabels[c.unitId] ?? c.unitId.slice(0, 8)}</Text>
              {c.remainingAmount <= 0 ? (
                <Chip label="Ödendi" tone="success" />
              ) : c.paidAmount > 0 ? (
                <Chip label="Kısmi Ödendi" tone="warning" />
              ) : (
                <Chip label="Ödenmedi" />
              )}
            </View>
            <Text style={styles.chargeType}>{CHARGE_TYPE_LABELS[c.type] ?? c.type}{c.period ? ` · ${c.period}` : ""}</Text>
            <View style={styles.amountsRow}>
              <Text style={styles.amountText}>Tutar: {c.amount.toLocaleString("tr-TR")} ₺</Text>
              <Text style={styles.amountText}>Ödenen: {c.paidAmount.toLocaleString("tr-TR")} ₺</Text>
              <Text style={[styles.amountText, { fontWeight: "700" }]}>Kalan: {c.remainingAmount.toLocaleString("tr-TR")} ₺</Text>
            </View>
            {c.remainingAmount > 0 && (
              <AppButton
                small
                variant="outlined"
                label="Ödeme Al"
                onPress={() => { setPayingCharge(c); setPayAmount(String(c.remainingAmount)); }}
              />
            )}
          </Card>
        ))
      )}

      <FormSheet visible={genDialogOpen} title="Aylık Aidat Üret" onClose={() => setGenDialogOpen(false)} onSubmit={handleGenerate} submitting={submitting} submitLabel="Üret">
        <FormField label="Dönem (YYYY-MM)" value={period} onChangeText={setPeriod} placeholder="2026-09" autoFocus />
        <FormField label="Son Ödeme Tarihi (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} placeholder="2026-09-30" />
        <FormField label="Birim Aidat Tutarı" value={baseAmount} onChangeText={setBaseAmount} keyboardType="numeric" />
      </FormSheet>

      <FormSheet visible={Boolean(payingCharge)} title="Ödeme Al" onClose={() => setPayingCharge(null)} onSubmit={handlePay} submitting={submitting}>
        <FormField label="Tutar" value={payAmount} onChangeText={setPayAmount} keyboardType="numeric" autoFocus />
        <SelectField
          label="Yöntem"
          value={payMethod}
          onChange={(v) => setPayMethod(v as PaymentMethod)}
          options={[
            { label: "Nakit", value: "nakit" },
            { label: "Banka Havalesi", value: "banka_havalesi" },
            { label: "Diğer", value: "diger" },
          ]}
        />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chargeCard: {
    marginBottom: 10,
  },
  unitLabel: {
    fontWeight: "700",
    color: colors.textPrimary,
    fontSize: 14,
  },
  chargeType: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  amountsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  amountText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
});
