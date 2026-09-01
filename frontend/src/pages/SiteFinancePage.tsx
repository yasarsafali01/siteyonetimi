import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { bulkGenerateDues, createPayment, listChargesForSite } from "../api/finance";
import { listBlocks, listUnits } from "../api/sites";
import type { ChargeWithBalance, PaymentMethod } from "../types/finance";

const CHARGE_TYPE_LABELS: Record<string, string> = {
  aidat: "Aidat",
  ek_aidat: "Ek Aidat",
  ozel_gider: "Özel Gider",
  gecikme_faizi: "Gecikme Faizi",
  gecikme_tazminati: "Gecikme Tazminatı",
};

export function SiteFinancePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [charges, setCharges] = useState<ChargeWithBalance[]>([]);
  const [unitLabels, setUnitLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [period, setPeriod] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [baseAmount, setBaseAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await bulkGenerateDues(siteId, {
        period,
        dueDate: new Date(dueDate).toISOString(),
        baseAmount: Number(baseAmount),
      });
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

  async function handlePay(e: FormEvent) {
    e.preventDefault();
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
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">Finans ve Aidat</Typography>
          <Button color="inherit" onClick={() => navigate(`/sites/${siteId}`)}>
            Site Detayı
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5">Borç / Tahsilat Listesi</Typography>
          <Button variant="contained" onClick={() => setGenDialogOpen(true)}>
            Aylık Aidat Üret
          </Button>
        </Box>

        <Paper sx={{ p: 2, mb: 2, display: "inline-block" }}>
          <Typography variant="body2" color="text.secondary">
            Toplam Kalan Bakiye
          </Typography>
          <Typography variant="h5">{totalRemaining.toLocaleString("tr-TR")} ₺</Typography>
        </Paper>

        {charges.length === 0 ? (
          <Typography color="text.secondary">Henüz borç kaydı yok.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Bağımsız Bölüm</TableCell>
                <TableCell>Tür</TableCell>
                <TableCell>Dönem</TableCell>
                <TableCell>Tutar</TableCell>
                <TableCell>Ödenen</TableCell>
                <TableCell>Kalan</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {charges.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{unitLabels[c.unitId] ?? c.unitId.slice(0, 8)}</TableCell>
                  <TableCell>{CHARGE_TYPE_LABELS[c.type] ?? c.type}</TableCell>
                  <TableCell>{c.period ?? "-"}</TableCell>
                  <TableCell>{c.amount.toLocaleString("tr-TR")} ₺</TableCell>
                  <TableCell>{c.paidAmount.toLocaleString("tr-TR")} ₺</TableCell>
                  <TableCell>{c.remainingAmount.toLocaleString("tr-TR")} ₺</TableCell>
                  <TableCell>
                    {c.remainingAmount <= 0 ? (
                      <Chip label="Ödendi" color="success" size="small" />
                    ) : c.paidAmount > 0 ? (
                      <Chip label="Kısmi Ödendi" color="warning" size="small" />
                    ) : (
                      <Chip label="Ödenmedi" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {c.remainingAmount > 0 && (
                      <Button
                        size="small"
                        onClick={() => {
                          setPayingCharge(c);
                          setPayAmount(String(c.remainingAmount));
                        }}
                      >
                        Ödeme Al
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={genDialogOpen} onClose={() => setGenDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleGenerate}>
          <DialogTitle>Aylık Aidat Üret</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Dönem (YYYY-MM)"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="2026-09"
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Son Ödeme Tarihi"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Birim Aidat Tutarı (katsayı 1 için)"
              type="number"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
              required
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Üret
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(payingCharge)} onClose={() => setPayingCharge(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handlePay}>
          <DialogTitle>Ödeme Al</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Tutar"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
              autoFocus
              fullWidth
            />
            <TextField select label="Yöntem" value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} fullWidth>
              <MenuItem value="nakit">Nakit</MenuItem>
              <MenuItem value="banka_havalesi">Banka Havalesi</MenuItem>
              <MenuItem value="diger">Diğer</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPayingCharge(null)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Kaydet
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
