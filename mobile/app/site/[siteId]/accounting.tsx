import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { SelectField } from "../../../src/components/ui/SelectField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { StatCard } from "../../../src/components/ui/StatCard";
import { colors } from "../../../src/theme";
import {
  createAccount,
  createBudget,
  createJournalEntry,
  getBalanceSheet,
  getIncomeStatement,
  getTrialBalance,
  listAccounts,
  listBudgetComparison,
  listJournalEntries,
} from "../../../src/api/accounting";
import type { Account, AccountType, BalanceSheet, BudgetComparison, IncomeStatement, JournalEntry, TrialBalanceRow } from "../../../src/types/accounting";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "kasa", label: "Kasa" },
  { value: "banka", label: "Banka" },
  { value: "gelir", label: "Gelir" },
  { value: "gider", label: "Gider" },
  { value: "cari_alacak", label: "Cari Alacak" },
  { value: "cari_borc", label: "Cari Borç" },
  { value: "diger", label: "Diğer" },
];

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function AccountingScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [budgetPeriod, setBudgetPeriod] = useState(currentPeriod());
  const [budgetComparison, setBudgetComparison] = useState<BudgetComparison[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accCode, setAccCode] = useState("");
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<AccountType>("kasa");

  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryDesc, setEntryDesc] = useState("");
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [entryAmount, setEntryAmount] = useState("");

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetAccountId, setBudgetAccountId] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      const [acc, ent, tb, is, bs, bc] = await Promise.all([
        listAccounts(siteId),
        listJournalEntries(siteId),
        getTrialBalance(siteId),
        getIncomeStatement(siteId),
        getBalanceSheet(siteId),
        listBudgetComparison(siteId, budgetPeriod).catch(() => []),
      ]);
      setAccounts(acc);
      setEntries(ent);
      setTrialBalance(tb);
      setIncomeStatement(is);
      setBalanceSheet(bs);
      setBudgetComparison(bc);
      if (!debitAccountId && acc.length > 0) setDebitAccountId(acc[0].id);
      if (!creditAccountId && acc.length > 0) setCreditAccountId(acc[0].id);
      if (!budgetAccountId && acc.length > 0) setBudgetAccountId(acc[0].id);
      setError(null);
    } catch {
      setError("Muhasebe verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId, budgetPeriod]));

  function accountLabel(id: string) {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} - ${a.name}` : id.slice(0, 8);
  }

  async function handleCreateAccount() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createAccount(siteId, { code: accCode, name: accName, type: accType });
      setAccountDialogOpen(false);
      setAccCode("");
      setAccName("");
      await refresh();
    } catch {
      setError("Hesap oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateEntry() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createJournalEntry(siteId, { entryDate, description: entryDesc, debitAccountId, creditAccountId, amount: Number(entryAmount) });
      setEntryDialogOpen(false);
      setEntryDesc("");
      setEntryAmount("");
      await refresh();
    } catch {
      setError("Muhasebe fişi oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateBudget() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createBudget(siteId, { accountId: budgetAccountId, period: budgetPeriod, plannedAmount: Number(budgetAmount) });
      setBudgetDialogOpen(false);
      setBudgetAmount("");
      await refresh();
    } catch {
      setError("Bütçe kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  const accountOptions = accounts.map((a) => ({ label: `${a.code} - ${a.name}`, value: a.id }));

  return (
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      <View style={styles.statGrid}>
        <StatCard icon="trending-up-outline" label="Net Kâr" value={`${(incomeStatement?.netIncome ?? 0).toLocaleString("tr-TR")} ₺`} tone="success" />
        <StatCard icon="pie-chart-outline" label="Öz Kaynak" value={`${(balanceSheet?.netEquity ?? 0).toLocaleString("tr-TR")} ₺`} tone="info" />
        <StatCard icon="wallet-outline" label="Kasa + Banka" value={`${((balanceSheet?.cash ?? 0) + (balanceSheet?.bank ?? 0)).toLocaleString("tr-TR")} ₺`} tone="primary" />
      </View>

      <View style={styles.rowHeader}>
        <Text style={styles.sectionTitle}>Hesap Planı</Text>
        <AppButton small label="Yeni Hesap" onPress={() => setAccountDialogOpen(true)} />
      </View>
      {accounts.length === 0 ? (
        <EmptyState text="Henüz hesap eklenmedi." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 20 }}>
          {accounts.map((a) => (
            <ListRow key={a.id} title={`${a.code} - ${a.name}`} subtitle={ACCOUNT_TYPES.find((t) => t.value === a.type)?.label} />
          ))}
        </Card>
      )}

      <View style={styles.rowHeader}>
        <Text style={styles.sectionTitle}>Muhasebe Fişleri</Text>
        <AppButton small label="Yeni Fiş" onPress={() => setEntryDialogOpen(true)} disabled={accounts.length < 2} />
      </View>
      {entries.length === 0 ? (
        <EmptyState text="Henüz fiş girilmedi." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 20 }}>
          {entries.map((e) => (
            <ListRow
              key={e.id}
              title={e.description}
              subtitle={`${new Date(e.entryDate).toLocaleDateString("tr-TR")} · B: ${accountLabel(e.debitAccountId)} → A: ${accountLabel(e.creditAccountId)} · ${e.amount.toLocaleString("tr-TR")} ₺`}
            />
          ))}
        </Card>
      )}

      <Text style={styles.sectionTitle}>Mizan</Text>
      {trialBalance.length === 0 ? (
        <EmptyState text="Kayıt yok." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 20 }}>
          {trialBalance.map((r) => (
            <ListRow
              key={r.accountId}
              title={`${r.accountCode} - ${r.accountName}`}
              subtitle={`Borç ${r.totalDebit.toLocaleString("tr-TR")} ₺ · Alacak ${r.totalCredit.toLocaleString("tr-TR")} ₺ · Bakiye ${r.balance.toLocaleString("tr-TR")} ₺`}
            />
          ))}
        </Card>
      )}

      <View style={styles.rowHeader}>
        <Text style={styles.sectionTitle}>Bütçe ({budgetPeriod})</Text>
        <AppButton small label="Bütçe Ekle" onPress={() => setBudgetDialogOpen(true)} disabled={accounts.length === 0} />
      </View>
      <FormField label="Dönem (YYYY-MM)" value={budgetPeriod} onChangeText={setBudgetPeriod} />
      {budgetComparison.length === 0 ? (
        <EmptyState text="Bu dönem için bütçe girilmedi." />
      ) : (
        <Card style={{ padding: 0 }}>
          {budgetComparison.map((b) => (
            <ListRow
              key={b.id}
              title={accountLabel(b.accountId)}
              subtitle={`Planlanan ${b.plannedAmount.toLocaleString("tr-TR")} ₺ · Gerçekleşen ${b.actualAmount.toLocaleString("tr-TR")} ₺ · Fark ${b.variance.toLocaleString("tr-TR")} ₺`}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={accountDialogOpen} title="Yeni Hesap" onClose={() => setAccountDialogOpen(false)} onSubmit={handleCreateAccount} submitting={submitting}>
        <FormField label="Hesap Kodu" value={accCode} onChangeText={setAccCode} autoFocus />
        <FormField label="Hesap Adı" value={accName} onChangeText={setAccName} />
        <SelectField label="Tür" value={accType} onChange={(v) => setAccType(v as AccountType)} options={ACCOUNT_TYPES} />
      </FormSheet>

      <FormSheet visible={entryDialogOpen} title="Yeni Muhasebe Fişi" onClose={() => setEntryDialogOpen(false)} onSubmit={handleCreateEntry} submitting={submitting}>
        <FormField label="Tarih (YYYY-MM-DD)" value={entryDate} onChangeText={setEntryDate} />
        <FormField label="Açıklama" value={entryDesc} onChangeText={setEntryDesc} />
        {accountOptions.length > 0 && (
          <>
            <SelectField label="Borç Hesabı" value={debitAccountId} onChange={setDebitAccountId} options={accountOptions} />
            <SelectField label="Alacak Hesabı" value={creditAccountId} onChange={setCreditAccountId} options={accountOptions} />
          </>
        )}
        <FormField label="Tutar" value={entryAmount} onChangeText={setEntryAmount} keyboardType="numeric" />
      </FormSheet>

      <FormSheet visible={budgetDialogOpen} title={`Bütçe Ekle (${budgetPeriod})`} onClose={() => setBudgetDialogOpen(false)} onSubmit={handleCreateBudget} submitting={submitting}>
        {accountOptions.length > 0 && <SelectField label="Hesap" value={budgetAccountId} onChange={setBudgetAccountId} options={accountOptions} />}
        <FormField label="Planlanan Tutar" value={budgetAmount} onChangeText={setBudgetAmount} keyboardType="numeric" />
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
    marginBottom: 8,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
});
