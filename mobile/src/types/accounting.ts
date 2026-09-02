export type AccountType = "kasa" | "banka" | "gelir" | "gider" | "cari_alacak" | "cari_borc" | "diger";

export interface Account {
  id: string;
  siteId: string;
  code: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  siteId: string;
  entryDate: string;
  description: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  createdAt: string;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export interface IncomeStatement {
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
}

export interface BalanceSheet {
  cash: number;
  bank: number;
  receivables: number;
  payables: number;
  totalAssets: number;
  totalLiabilities: number;
  netEquity: number;
}

export interface BudgetComparison {
  id: string;
  accountId: string;
  period: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
}

export interface MonthlyIncomeExpense {
  period: string; // "YYYY-MM"
  income: number;
  expense: number;
}
