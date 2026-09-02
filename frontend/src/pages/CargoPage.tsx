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
import {
  createCargoDelivery,
  deliverToResident,
  listCargoDeliveries,
  markCargoReturned,
  notifyCargoRecipient,
} from "../api/cargo";
import type { CargoDelivery, CargoStatus } from "../types/cargo";

const STATUS_LABELS: Record<CargoStatus, string> = {
  teslim_alindi: "Teslim Alındı",
  sakine_teslim_edildi: "Sakine Teslim Edildi",
  iade: "İade",
};
const STATUS_COLORS: Record<CargoStatus, "warning" | "success" | "default"> = {
  teslim_alindi: "warning",
  sakine_teslim_edildi: "success",
  iade: "default",
};

export function CargoPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [deliveries, setDeliveries] = useState<CargoDelivery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [courierCompany, setCourierCompany] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [description, setDescription] = useState("");

  const [deliverTarget, setDeliverTarget] = useState<CargoDelivery | null>(null);
  const [deliveredTo, setDeliveredTo] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      setDeliveries(await listCargoDeliveries(siteId));
      setError(null);
    } catch {
      setError("Kargo verileri yüklenemedi");
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
      await createCargoDelivery(siteId, {
        courierCompany: courierCompany || undefined,
        trackingNo: trackingNo || undefined,
        description: description || undefined,
      });
      setDialogOpen(false);
      setCourierCompany("");
      setTrackingNo("");
      setDescription("");
      await refresh();
    } catch {
      setError("Kargo kaydı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeliver(e: FormEvent) {
    e.preventDefault();
    if (!deliverTarget) return;
    setSubmitting(true);
    try {
      await deliverToResident(deliverTarget.id, deliveredTo);
      setDeliverTarget(null);
      setDeliveredTo("");
      await refresh();
    } catch {
      setError("Teslim işlemi kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReturn(id: string) {
    try {
      await markCargoReturned(id);
      await refresh();
    } catch {
      setError("İade işaretlenemedi");
    }
  }

  async function handleNotify(id: string) {
    try {
      await notifyCargoRecipient(id);
      await refresh();
    } catch {
      setError("Bildirim gönderilemedi");
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Kargo Kayıtları</Typography>
          <Button size="small" variant="contained" onClick={() => setDialogOpen(true)}>
            Kargo Kabul
          </Button>
        </Box>
        {deliveries.length === 0 ? (
          <Typography color="text.secondary">Henüz kargo kaydı yok.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kargo Firması</TableCell>
                <TableCell>Takip No</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Bildirim</TableCell>
                <TableCell>Alındı</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.courierCompany ?? "-"}</TableCell>
                  <TableCell>{d.trackingNo ?? "-"}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[d.status]} color={STATUS_COLORS[d.status]} size="small" />
                  </TableCell>
                  <TableCell>{d.notifiedAt ? "Gönderildi" : "-"}</TableCell>
                  <TableCell>{new Date(d.receivedAt).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>
                    {d.status === "teslim_alindi" && (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {!d.notifiedAt && (
                          <Button size="small" onClick={() => handleNotify(d.id)}>Bildir</Button>
                        )}
                        <Button size="small" color="success" onClick={() => { setDeliverTarget(d); setDeliveredTo(""); }}>
                          Teslim Et
                        </Button>
                        <Button size="small" color="error" onClick={() => handleReturn(d.id)}>İade</Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Kargo Kabul</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Kargo Firması" value={courierCompany} onChange={(e) => setCourierCompany(e.target.value)} autoFocus fullWidth />
            <TextField label="Takip No / Barkod" value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} fullWidth />
            <TextField label="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(deliverTarget)} onClose={() => setDeliverTarget(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleDeliver}>
          <DialogTitle>Sakine Teslim Et</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <TextField label="Teslim Alan" value={deliveredTo} onChange={(e) => setDeliveredTo(e.target.value)} required autoFocus fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeliverTarget(null)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Teslim Et</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
