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
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { createMeter, createReading, generateInvoice, getConsumptionHistory, listMeters, listReadings } from "../api/meter";
import { listBlocks, listUnits } from "../api/sites";
import type { ConsumptionEntry, Meter, MeterType, Reading } from "../types/meter";

const METER_TYPES: { value: MeterType; label: string }[] = [
  { value: "elektrik", label: "Elektrik" },
  { value: "su", label: "Su" },
  { value: "dogalgaz", label: "Doğalgaz" },
  { value: "kalorimetre", label: "Kalorimetre" },
];

export function MetersPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [meters, setMeters] = useState<Meter[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [type, setType] = useState<MeterType>("elektrik");
  const [serialNo, setSerialNo] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const [detailMeter, setDetailMeter] = useState<Meter | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [consumption, setConsumption] = useState<ConsumptionEntry[]>([]);
  const [readingDate, setReadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [readingValue, setReadingValue] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      const [meterData, blocks] = await Promise.all([listMeters(siteId), listBlocks(siteId)]);
      setMeters(meterData);
      const options: { id: string; label: string }[] = [];
      for (const block of blocks) {
        const units = await listUnits(block.id);
        for (const unit of units) {
          options.push({ id: unit.id, label: `${block.name} / ${unit.unitNumber}` });
        }
      }
      setUnitOptions(options);
      setError(null);
    } catch {
      setError("Sayaçlar yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  function unitLabel(id: string | null) {
    if (!id) return "Ortak Alan / Site Geneli";
    return unitOptions.find((u) => u.id === id)?.label ?? id.slice(0, 8);
  }

  async function handleCreateMeter(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createMeter(siteId, {
        unitId: unitId || undefined,
        type,
        serialNo: serialNo || undefined,
        unitPrice: Number(unitPrice || 0),
      });
      setCreateOpen(false);
      setUnitId("");
      setSerialNo("");
      setUnitPrice("");
      await refresh();
    } catch {
      setError("Sayaç oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(m: Meter) {
    setDetailMeter(m);
    setInfo(null);
    await refreshDetail(m.id);
  }

  async function refreshDetail(meterId: string) {
    const [r, c] = await Promise.all([listReadings(meterId), getConsumptionHistory(meterId)]);
    setReadings(r);
    setConsumption(c);
  }

  async function handleAddReading(e: FormEvent) {
    e.preventDefault();
    if (!detailMeter) return;
    setSubmitting(true);
    try {
      await createReading(detailMeter.id, { readingDate, value: Number(readingValue) });
      setReadingValue("");
      await refreshDetail(detailMeter.id);
    } catch {
      setError("Endeks girişi eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateInvoice() {
    if (!detailMeter) return;
    setSubmitting(true);
    setInfo(null);
    try {
      await generateInvoice(detailMeter.id);
      setInfo("Fatura oluşturuldu ve Finans modülüne eklendi.");
    } catch {
      setError("Fatura oluşturulamadı (en az iki okuma ve bağımsız bölüm gerekli)");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">Sayaç Yönetimi</Typography>
          <Button color="inherit" onClick={() => navigate(`/sites/${siteId}`)}>
            Site Detayı
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5">Sayaçlar</Typography>
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Yeni Sayaç
          </Button>
        </Box>

        {meters.length === 0 ? (
          <Typography color="text.secondary">Henüz sayaç eklenmedi.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tür</TableCell>
                <TableCell>Seri No</TableCell>
                <TableCell>Bağımsız Bölüm</TableCell>
                <TableCell>Birim Fiyat</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {meters.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{METER_TYPES.find((t) => t.value === m.type)?.label ?? m.type}</TableCell>
                  <TableCell>{m.serialNo ?? "-"}</TableCell>
                  <TableCell>{unitLabel(m.unitId)}</TableCell>
                  <TableCell>{m.unitPrice.toLocaleString("tr-TR")} ₺</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openDetail(m)}>
                      Endeks / Fatura
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateMeter}>
          <DialogTitle>Yeni Sayaç</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Tür" value={type} onChange={(e) => setType(e.target.value as MeterType)} fullWidth>
              {METER_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Bağımsız Bölüm (opsiyonel)" value={unitId} onChange={(e) => setUnitId(e.target.value)} fullWidth>
              <MenuItem value="">Ortak Alan / Site Geneli</MenuItem>
              {unitOptions.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Seri No" value={serialNo} onChange={(e) => setSerialNo(e.target.value)} fullWidth />
            <TextField label="Birim Fiyat" type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(detailMeter)} onClose={() => setDetailMeter(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {detailMeter && `${METER_TYPES.find((t) => t.value === detailMeter.type)?.label} — ${unitLabel(detailMeter.unitId)}`}
        </DialogTitle>
        <DialogContent>
          {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Endeks Okumaları</Typography>
          {readings.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>Henüz okuma yok.</Typography>
          ) : (
            <Table size="small" sx={{ mb: 2 }}>
              <TableBody>
                {readings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.readingDate).toLocaleDateString("tr-TR")}</TableCell>
                    <TableCell>{r.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Box component="form" onSubmit={handleAddReading} sx={{ display: "flex", gap: 1, mb: 3, alignItems: "center" }}>
            <TextField
              size="small"
              type="date"
              label="Tarih"
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField size="small" type="number" label="Endeks Değeri" value={readingValue} onChange={(e) => setReadingValue(e.target.value)} required />
            <Button type="submit" variant="outlined" size="small" disabled={submitting}>
              Ekle
            </Button>
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Tüketim Analizi</Typography>
          {consumption.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>Tüketim hesaplamak için en az iki okuma gerekli.</Typography>
          ) : (
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Dönem</TableCell>
                  <TableCell>Tüketim</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {consumption.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {new Date(c.fromDate).toLocaleDateString("tr-TR")} - {new Date(c.toDate).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>{c.consumption}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Button variant="contained" onClick={handleGenerateInvoice} disabled={submitting || readings.length < 2 || !detailMeter?.unitId}>
            Fatura Oluştur (Finans'a ekle)
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailMeter(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
