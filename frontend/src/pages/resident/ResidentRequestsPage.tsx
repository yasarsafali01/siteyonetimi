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
import { createRequest, listRequests } from "../../api/request";
import type { RequestPriority, RequestType, ServiceRequest } from "../../types/request";
import { useResident } from "./ResidentContext";

const REQUEST_TYPE_LABELS: Record<RequestType, string> = { ariza: "Arıza", sikayet: "Şikayet", oneri: "Öneri" };
const REQUEST_STATUS_LABELS: Record<string, string> = {
  yeni: "Yeni",
  atandi: "Atandı",
  inceleniyor: "İnceleniyor",
  cozuldu: "Çözüldü",
  kapatildi: "Kapatıldı",
};
const PRIORITY_LABELS: Record<RequestPriority, string> = { dusuk: "Düşük", normal: "Normal", yuksek: "Yüksek", acil: "Acil" };

export function ResidentRequestsPage() {
  const { activeResidency } = useResident();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState<RequestType>("ariza");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("normal");

  async function refresh() {
    try {
      setRequests(await listRequests(activeResidency.siteId));
      setError(null);
    } catch {
      setError("Talepler yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResidency.siteId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createRequest(activeResidency.siteId, { type, title, description: description || undefined, priority });
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      await refresh();
    } catch {
      setError("Talep oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ p: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5">Taleplerim</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Yeni Talep
        </Button>
      </Box>

      {requests.length === 0 ? (
        <Typography color="text.secondary">Henüz talebiniz yok.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tür</TableCell>
              <TableCell>Başlık</TableCell>
              <TableCell>Öncelik</TableCell>
              <TableCell>Durum</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{REQUEST_TYPE_LABELS[r.type]}</TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>{PRIORITY_LABELS[r.priority]}</TableCell>
                <TableCell>
                  <Chip label={REQUEST_STATUS_LABELS[r.status] ?? r.status} size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Talep</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Tür" value={type} onChange={(e) => setType(e.target.value as RequestType)} fullWidth>
              {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus fullWidth />
            <TextField label="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} fullWidth />
            <TextField select label="Öncelik" value={priority} onChange={(e) => setPriority(e.target.value as RequestPriority)} fullWidth>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Gönder</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
