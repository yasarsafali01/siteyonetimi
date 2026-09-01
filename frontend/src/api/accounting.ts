import { apiClient } from "./client";
import type { Account, AccountType, BalanceSheet, BudgetComparison, IncomeStatement, JournalEntry, TrialBalanceRow } from "../types/accounting";

export async function listAccounts(siteId: string) {
  const { data } = await apiClient.get<Account[]>(`/sites/${siteId}/accounts`);
  return data;
}

export async function createAccount(siteId: string, input: { code: string; name: string; type: AccountType }) {
  const { data } = await apiClient.post<Account>(`/sites/${siteId}/accounts`, input);
  return data;
}

export async function listJournalEntries(siteId: string) {
  const { data } = await apiClient.get<JournalEntry[]>(`/sites/${siteId}/journal-entries`);
  return data;
}

export async function createJournalEntry(
  siteId: string,
  input: { entryDate: string; description: string; debitAccountId: string; creditAccountId: string; amount: number }
) {
  const { data } = await apiClient.post<JournalEntry>(`/sites/${siteId}/journal-entries`, input);
  return data;
}

export async function getTrialBalance(siteId: string) {
  const { data } = await apiClient.get<TrialBalanceRow[]>(`/sites/${siteId}/reports/trial-balance`);
  return data;
}

export async function getIncomeStatement(siteId: string) {
  const { data } = await apiClient.get<IncomeStatement>(`/sites/${siteId}/reports/income-statement`);
  return data;
}

export async function getBalanceSheet(siteId: string) {
  const { data } = await apiClient.get<BalanceSheet>(`/sites/${siteId}/reports/balance-sheet`);
  return data;
}

export async function createBudget(siteId: string, input: { accountId: string; period: string; plannedAmount: number }) {
  const { data } = await apiClient.post(`/sites/${siteId}/budgets`, input);
  return data;
}

export async function listBudgetComparison(siteId: string, period: string) {
  const { data } = await apiClient.get<BudgetComparison[]>(`/sites/${siteId}/budgets`, { params: { period } });
  return data;
}
