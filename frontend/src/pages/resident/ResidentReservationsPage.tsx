import { useEffect, useState, type FormEvent } from "react";
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
import AddIcon from "@mui/icons-material/Add";
import { listCommonAreas } from "../../api/sites";
import { createFacilityReservation, listFacilityReservations } from "../../api/reservation";
import type { CommonArea } from "../../types/site";
import type { FacilityReservation } from "../../types/reservation";
import { useResident } from "./ResidentContext";

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  iptal: "İptal",
  tamamlandi: "Tamamlandı",
};

export function ResidentReservationsPage() {
  const { activeResidency } = useResident();

  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [areaId, setAreaId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  async function refresh() {
    try {
      const [res, areas] = await Promise.all([listFacilityReservations(activeResidency.siteId), listCommonAreas(activeResidency.siteId)]);
      setReservations(res.filter((r) => r.unitId === activeResidency.unitId));
      setCommonAreas(areas);
      setError(null);
    } catch {
      setError("Rezervasyonlar yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResidency.siteId, activeResidency.unitId]);

  function areaName(id: string) {
    return commonAreas.find((a) => a.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFacilityReservation(activeResidency.siteId, {
        commonAreaId: areaId,
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      });
      setDialogOpen(false);
      setAreaId("");
      await refresh();
    } catch {
      setError("Rezervasyon oluşturulamadı — seçilen alan bu aralıkta dolu olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ p: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5">Rezervasyonlarım</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} disabled={commonAreas.length === 0}>
          Yeni Rezervasyon
        </Button>
      </Box>

      {commonAreas.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>Sitede henüz rezerve edilebilir ortak alan tanımlanmamış.</Typography>
      )}
      {reservations.length === 0 ? (
        <Typography color="text.secondary">Henüz rezervasyonunuz yok.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ortak Alan</TableCell>
              <TableCell>Başlangıç</TableCell>
              <TableCell>Bitiş</TableCell>
              <TableCell>Durum</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reservations.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{areaName(r.commonAreaId)}</TableCell>
                <TableCell>{new Date(r.startTime).toLocaleString("tr-TR")}</TableCell>
                <TableCell>{new Date(r.endTime).toLocaleString("tr-TR")}</TableCell>
                <TableCell>
                  <Chip label={RESERVATION_STATUS_LABELS[r.status] ?? r.status} size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Rezervasyon</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Ortak Alan" value={areaId} onChange={(e) => setAreaId(e.target.value)} required autoFocus fullWidth>
              {commonAreas.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Başlangıç"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Bitiş"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
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
