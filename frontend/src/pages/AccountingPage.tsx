import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
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
} from "../api/accounting";
import type { Account, AccountType, BalanceSheet, BudgetComparison, IncomeStatement, JournalEntry, TrialBalanceRow } from "../types/accounting";

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

export function AccountingPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [budgetPeriod, setBudgetPeriod] = useState(currentPeriod());
  const [budgetComparison, setBudgetComparison] = useState<BudgetComparison[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const [submitting, setSubmitting] = useState(false);

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
      setError(null);
    } catch {
      setError("Muhasebe verileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, budgetPeriod]);

  function accountLabel(id: string) {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.code} - ${a.name}` : id.slice(0, 8);
  }

  async function handleCreateAccount(e: FormEvent) {
    e.preventDefault();
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

  async function handleCreateEntry(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createJournalEntry(siteId, {
        entryDate,
        description: entryDesc,
        debitAccountId,
        creditAccountId,
        amount: Number(entryAmount),
      });
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

  async function handleCreateBudget(e: FormEvent) {
    e.preventDefault();
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

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">Muhasebe</Typography>
          <Button color="inherit" onClick={() => navigate(`/sites/${siteId}`)}>
            Site Detayı
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">Gelir Tablosu — Net Kâr</Typography>
              <Typography variant="h5">{(incomeStatement?.netIncome ?? 0).toLocaleString("tr-TR")} ₺</Typography>
              <Typography variant="caption" color="text.secondary">
                Gelir {(incomeStatement?.totalIncome ?? 0).toLocaleString("tr-TR")} ₺ · Gider {(incomeStatement?.totalExpense ?? 0).toLocaleString("tr-TR")} ₺
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">Bilanço — Öz Kaynak</Typography>
              <Typography variant="h5">{(balanceSheet?.netEquity ?? 0).toLocaleString("tr-TR")} ₺</Typography>
              <Typography variant="caption" color="text.secondary">
                Varlıklar {(balanceSheet?.totalAssets ?? 0).toLocaleString("tr-TR")} ₺ · Borçlar {(balanceSheet?.totalLiabilities ?? 0).toLocaleString("tr-TR")} ₺
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">Kasa + Banka</Typography>
              <Typography variant="h5">{((balanceSheet?.cash ?? 0) + (balanceSheet?.bank ?? 0)).toLocaleString("tr-TR")} ₺</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Hesap Planı</Typography>
          <Button size="small" variant="contained" onClick={() => setAccountDialogOpen(true)}>
            Yeni Hesap
          </Button>
        </Box>
        {accounts.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz hesap eklenmedi.</Typography>
        ) : (
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Kod</TableCell>
                <TableCell>Ad</TableCell>
                <TableCell>Tür</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.code}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{ACCOUNT_TYPES.find((t) => t.value === a.type)?.label ?? a.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Muhasebe Fişleri</Typography>
          <Button size="small" variant="contained" onClick={() => setEntryDialogOpen(true)} disabled={accounts.length < 2}>
            Yeni Fiş
          </Button>
        </Box>
        {entries.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz fiş girilmedi.</Typography>
        ) : (
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Tarih</TableCell>
                <TableCell>Açıklama</TableCell>
                <TableCell>Borç Hesabı</TableCell>
                <TableCell>Alacak Hesabı</TableCell>
                <TableCell>Tutar</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.entryDate).toLocaleDateString("tr-TR")}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{accountLabel(e.debitAccountId)}</TableCell>
                  <TableCell>{accountLabel(e.creditAccountId)}</TableCell>
                  <TableCell>{e.amount.toLocaleString("tr-TR")} ₺</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Typography variant="h6" sx={{ mb: 1 }}>Mizan</Typography>
        {trialBalance.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Kayıt yok.</Typography>
        ) : (
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Hesap</TableCell>
                <TableCell>Borç</TableCell>
                <TableCell>Alacak</TableCell>
                <TableCell>Bakiye</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trialBalance.map((r) => (
                <TableRow key={r.accountId}>
                  <TableCell>{r.accountCode} - {r.accountName}</TableCell>
                  <TableCell>{r.totalDebit.toLocaleString("tr-TR")} ₺</TableCell>
                  <TableCell>{r.totalCredit.toLocaleString("tr-TR")} ₺</TableCell>
                  <TableCell>{r.balance.toLocaleString("tr-TR")} ₺</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Bütçe ({budgetPeriod})</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              label="Dönem"
              value={budgetPeriod}
              onChange={(e) => setBudgetPeriod(e.target.value)}
              sx={{ width: 140 }}
            />
            <Button size="small" variant="contained" onClick={() => setBudgetDialogOpen(true)} disabled={accounts.length === 0}>
              Bütçe Ekle
            </Button>
          </Box>
        </Box>
        {budgetComparison.length === 0 ? (
          <Typography color="text.secondary">Bu dönem için bütçe girilmedi.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Hesap</TableCell>
                <TableCell>Planlanan</TableCell>
                <TableCell>Gerçekleşen</TableCell>
                <TableCell>Fark</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budgetComparison.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{accountLabel(b.accountId)}</TableCell>
                  <TableCell>{b.plannedAmount.toLocaleString("tr-TR")} ₺</TableCell>
                  <TableCell>{b.actualAmount.toLocaleString("tr-TR")} ₺</TableCell>
                  <TableCell>{b.variance.toLocaleString("tr-TR")} ₺</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={accountDialogOpen} onClose={() => setAccountDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateAccount}>
          <DialogTitle>Yeni Hesap</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Hesap Kodu" value={accCode} onChange={(e) => setAccCode(e.target.value)} required autoFocus fullWidth />
            <TextField label="Hesap Adı" value={accName} onChange={(e) => setAccName(e.target.value)} required fullWidth />
            <TextField select label="Tür" value={accType} onChange={(e) => setAccType(e.target.value as AccountType)} fullWidth>
              {ACCOUNT_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAccountDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={entryDialogOpen} onClose={() => setEntryDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateEntry}>
          <DialogTitle>Yeni Muhasebe Fişi</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Tarih"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField label="Açıklama" value={entryDesc} onChange={(e) => setEntryDesc(e.target.value)} required fullWidth />
            <TextField select label="Borç Hesabı" value={debitAccountId} onChange={(e) => setDebitAccountId(e.target.value)} required fullWidth>
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Alacak Hesabı" value={creditAccountId} onChange={(e) => setCreditAccountId(e.target.value)} required fullWidth>
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Tutar" type="number" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} required fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEntryDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={budgetDialogOpen} onClose={() => setBudgetDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateBudget}>
          <DialogTitle>Bütçe Ekle ({budgetPeriod})</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Hesap" value={budgetAccountId} onChange={(e) => setBudgetAccountId(e.target.value)} required autoFocus fullWidth>
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.code} - {a.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Planlanan Tutar" type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} required fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBudgetDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
