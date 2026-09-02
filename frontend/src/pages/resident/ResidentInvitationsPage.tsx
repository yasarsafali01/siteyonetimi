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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { createInvitation, listInvitations } from "../../api/visitor";
import type { VisitorInvitation } from "../../types/visitor";
import { useResident } from "./ResidentContext";

const INVITATION_STATUS_LABELS: Record<string, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  kullanildi: "Kullanıldı",
  iptal: "İptal",
};

export function ResidentInvitationsPage() {
  const { activeResidency } = useResident();

  const [invitations, setInvitations] = useState<VisitorInvitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [validUntil, setValidUntil] = useState("");

  async function refresh() {
    try {
      setInvitations(await listInvitations(activeResidency.siteId));
      setError(null);
    } catch {
      setError("Davetiyeler yüklenemedi");
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
      await createInvitation(activeResidency.siteId, {
        visitorName: name,
        visitorPhone: phone || undefined,
        validUntil: new Date(validUntil).toISOString(),
      });
      setDialogOpen(false);
      setName("");
      setPhone("");
      await refresh();
    } catch {
      setError("Davetiye oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ p: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5">Ziyaretçi Davetiyelerim</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Yeni Davetiye
        </Button>
      </Box>

      {invitations.length === 0 ? (
        <Typography color="text.secondary">Henüz davetiyeniz yok.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ziyaretçi</TableCell>
              <TableCell>Kod</TableCell>
              <TableCell>Geçerlilik</TableCell>
              <TableCell>Durum</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.visitorName}</TableCell>
                <TableCell>
                  <Chip label={inv.invitationCode} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{new Date(inv.validUntil).toLocaleString("tr-TR")}</TableCell>
                <TableCell>
                  <Chip label={INVITATION_STATUS_LABELS[inv.status] ?? inv.status} size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Ziyaretçi Davetiyesi</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Ziyaretçi Adı" value={name} onChange={(e) => setName(e.target.value)} required autoFocus fullWidth />
            <TextField label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
            <TextField
              label="Geçerlilik Bitişi"
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
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
