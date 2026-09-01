import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { assignAsset, createAsset, createCount, getDepreciation, listAssets, listCounts, returnAsset } from "../api/inventory";
import { getCurrentUserId } from "../api/client";
import type { Asset, AssetCount, AssetStatus, Depreciation } from "../types/inventory";

const STATUS_LABELS: Record<AssetStatus, string> = {
  depoda: "Depoda",
  zimmetli: "Zimmetli",
  hurda: "Hurda",
  kayip: "Kayıp",
};
const STATUS_COLORS: Record<AssetStatus, "default" | "info" | "error" | "warning"> = {
  depoda: "default",
  zimmetli: "info",
  hurda: "error",
  kayip: "warning",
};

export function InventoryPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [counts, setCounts] = useState<AssetCount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [usefulLifeYears, setUsefulLifeYears] = useState("");

  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [depreciation, setDepreciation] = useState<Depreciation | null>(null);

  async function refresh() {
    if (!siteId) return;
    try {
      const [a, c] = await Promise.all([listAssets(siteId), listCounts(siteId)]);
      setAssets(a);
      setCounts(c);
      setError(null);
    } catch {
      setError("Demirbaş verileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createAsset(siteId, {
        name,
        serialNo: serialNo || undefined,
        purchaseDate: purchaseDate || undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        usefulLifeYears: usefulLifeYears ? Number(usefulLifeYears) : undefined,
      });
      setCreateOpen(false);
      setName("");
      setSerialNo("");
      setPurchaseDate("");
      setPurchasePrice("");
      setUsefulLifeYears("");
      await refresh();
    } catch {
      setError("Demirbaş oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(asset: Asset) {
    setDetailAsset(asset);
    try {
      setDepreciation(await getDepreciation(asset.id));
    } catch {
      setDepreciation(null);
    }
  }

  async function handleAssignToMe(asset: Asset) {
    const uid = getCurrentUserId();
    if (!uid) return;
    try {
      await assignAsset(asset.id, uid, "Bana zimmetlendi");
      await refresh();
      setDetailAsset(null);
    } catch {
      setError("Zimmet işlemi yapılamadı");
    }
  }

  async function handleReturn(asset: Asset) {
    try {
      await returnAsset(asset.id);
      await refresh();
      setDetailAsset(null);
    } catch {
      setError("İade işlemi yapılamadı");
    }
  }

  async function handleCreateCount() {
    if (!siteId) return;
    try {
      await createCount(siteId, "Sayım");
      await refresh();
    } catch {
      setError("Sayım oluşturulamadı");
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5">Demirbaş ve Envanter</Typography>
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Yeni Demirbaş
          </Button>
        </Box>

        {assets.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz demirbaş eklenmedi.</Typography>
        ) : (
          <Table sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Ad</TableCell>
                <TableCell>Seri No</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.serialNo ?? "-"}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[a.status]} color={STATUS_COLORS[a.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openDetail(a)}>
                      Detay
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Sayım İşlemleri</Typography>
          <Button size="small" variant="contained" onClick={handleCreateCount}>
            Yeni Sayım Başlat
          </Button>
        </Box>
        {counts.length === 0 ? (
          <Typography color="text.secondary">Henüz sayım yapılmadı.</Typography>
        ) : (
          counts.map((c) => (
            <Typography key={c.id} variant="body2" color="text.secondary">
              {new Date(c.countDate).toLocaleDateString("tr-TR")} {c.note ? `— ${c.note}` : ""}
            </Typography>
          ))
        )}
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Demirbaş</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Ad" value={name} onChange={(e) => setName(e.target.value)} required autoFocus fullWidth />
            <TextField label="Seri No" value={serialNo} onChange={(e) => setSerialNo(e.target.value)} fullWidth />
            <TextField
              label="Satın Alma Tarihi"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField label="Satın Alma Fiyatı" type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} fullWidth />
            <TextField
              label="Faydalı Ömür (yıl)"
              type="number"
              value={usefulLifeYears}
              onChange={(e) => setUsefulLifeYears(e.target.value)}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(detailAsset)} onClose={() => setDetailAsset(null)} fullWidth maxWidth="xs">
        <DialogTitle>{detailAsset?.name}</DialogTitle>
        <DialogContent>
          {detailAsset && (
            <Chip label={STATUS_LABELS[detailAsset.status]} color={STATUS_COLORS[detailAsset.status]} size="small" sx={{ mb: 2 }} />
          )}
          {depreciation && depreciation.purchasePrice > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">Yıllık amortisman: {depreciation.annualAmount.toLocaleString("tr-TR")} ₺</Typography>
              <Typography variant="body2">Birikmiş amortisman: {depreciation.accumulatedAmount.toLocaleString("tr-TR")} ₺</Typography>
              <Typography variant="body2">Net defter değeri: {depreciation.bookValue.toLocaleString("tr-TR")} ₺</Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            {detailAsset?.status !== "zimmetli" ? (
              <Button size="small" variant="outlined" onClick={() => detailAsset && handleAssignToMe(detailAsset)}>
                Bana Zimmetle
              </Button>
            ) : (
              <Button size="small" variant="outlined" onClick={() => detailAsset && handleReturn(detailAsset)}>
                İade Al
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailAsset(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
