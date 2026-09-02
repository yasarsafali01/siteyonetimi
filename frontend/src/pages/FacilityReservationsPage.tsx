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
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { listCommonAreas } from "../api/sites";
import {
  cancelFacilityReservation,
  createFacilityReservation,
  decideFacilityReservation,
  listFacilityReservations,
} from "../api/reservation";
import type { CommonArea } from "../types/site";
import type { FacilityReservation, FacilityReservationStatus } from "../types/reservation";

const STATUS_LABELS: Record<FacilityReservationStatus, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  iptal: "İptal",
  tamamlandi: "Tamamlandı",
};
const STATUS_COLORS: Record<FacilityReservationStatus, "warning" | "success" | "error" | "default"> = {
  bekliyor: "warning",
  onaylandi: "success",
  reddedildi: "error",
  iptal: "default",
  tamamlandi: "default",
};

export function FacilityReservationsPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [areaId, setAreaId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");

  function areaName(id: string) {
    return areas.find((a) => a.id === id)?.name ?? id.slice(0, 8);
  }

  async function refresh() {
    if (!siteId) return;
    try {
      const [a, r] = await Promise.all([listCommonAreas(siteId), listFacilityReservations(siteId)]);
      setAreas(a);
      setReservations(r);
      setError(null);
    } catch {
      setError("Rezervasyon verileri yüklenemedi");
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
      await createFacilityReservation(siteId, {
        commonAreaId: areaId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        note: note || undefined,
      });
      setDialogOpen(false);
      setAreaId("");
      setNote("");
      await refresh();
    } catch {
      setError("Rezervasyon oluşturulamadı — seçilen alan bu aralıkta dolu olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecide(id: string, approve: boolean) {
    try {
      await decideFacilityReservation(id, approve);
      await refresh();
    } catch {
      setError("Rezervasyon güncellenemedi");
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelFacilityReservation(id);
      await refresh();
    } catch {
      setError("Rezervasyon iptal edilemedi");
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Sosyal Tesis Rezervasyonları</Typography>
          <Button size="small" variant="contained" onClick={() => setDialogOpen(true)} disabled={areas.length === 0}>
            Yeni Rezervasyon
          </Button>
        </Box>
        {areas.length === 0 && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Rezervasyon açabilmek için önce site sayfasından ortak alan (havuz, spor salonu, toplantı salonu vb.) ekleyin.
          </Typography>
        )}
        {reservations.length === 0 ? (
          <Typography color="text.secondary">Henüz rezervasyon yok.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ortak Alan</TableCell>
                <TableCell>Başlangıç</TableCell>
                <TableCell>Bitiş</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{areaName(r.commonAreaId)}</TableCell>
                  <TableCell>{new Date(r.startTime).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>{new Date(r.endTime).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[r.status]} color={STATUS_COLORS[r.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {r.status === "bekliyor" && (
                        <>
                          <Button size="small" color="success" onClick={() => handleDecide(r.id, true)}>Onayla</Button>
                          <Button size="small" color="error" onClick={() => handleDecide(r.id, false)}>Reddet</Button>
                        </>
                      )}
                      {(r.status === "bekliyor" || r.status === "onaylandi") && (
                        <Button size="small" onClick={() => handleCancel(r.id)}>İptal Et</Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Rezervasyon</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Ortak Alan" value={areaId} onChange={(e) => setAreaId(e.target.value)} required autoFocus fullWidth>
              {areas.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Başlangıç"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Bitiş"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField label="Not" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
