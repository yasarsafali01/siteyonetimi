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
  Tabs,
  Tab,
  TextField,
  Typography,
} from "@mui/material";
import {
  checkInWalkIn,
  checkInWithCode,
  checkOut,
  createInvitation,
  decideInvitation,
  listInvitations,
  listVisitorLogs,
} from "../api/visitor";
import type { InvitationStatus, VisitorInvitation, VisitorLog } from "../types/visitor";

const STATUS_LABELS: Record<InvitationStatus, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  kullanildi: "Kullanıldı",
  iptal: "İptal",
};
const STATUS_COLORS: Record<InvitationStatus, "default" | "warning" | "success" | "error"> = {
  bekliyor: "warning",
  onaylandi: "success",
  reddedildi: "error",
  kullanildi: "default",
  iptal: "default",
};

function defaultValidUntil() {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d.toISOString().slice(0, 16);
}

export function VisitorsPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [invitations, setInvitations] = useState<VisitorInvitation[]>([]);
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [invName, setInvName] = useState("");
  const [invPhone, setInvPhone] = useState("");
  const [invPlate, setInvPlate] = useState("");
  const [invValidUntil, setInvValidUntil] = useState(defaultValidUntil());

  const [checkInTab, setCheckInTab] = useState<"walkin" | "code">("walkin");
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [wName, setWName] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wIdNumber, setWIdNumber] = useState("");
  const [wPlate, setWPlate] = useState("");
  const [wCard, setWCard] = useState("");
  const [code, setCode] = useState("");
  const [codeCard, setCodeCard] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      const [inv, lg] = await Promise.all([listInvitations(siteId), listVisitorLogs(siteId)]);
      setInvitations(inv);
      setLogs(lg);
      setError(null);
    } catch {
      setError("Ziyaretçi verileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function handleCreateInvitation(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createInvitation(siteId, {
        visitorName: invName,
        visitorPhone: invPhone || undefined,
        vehiclePlate: invPlate || undefined,
        validUntil: new Date(invValidUntil).toISOString(),
      });
      setInvDialogOpen(false);
      setInvName("");
      setInvPhone("");
      setInvPlate("");
      setInvValidUntil(defaultValidUntil());
      await refresh();
    } catch {
      setError("Davetiye oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecide(id: string, approve: boolean) {
    try {
      await decideInvitation(id, approve);
      await refresh();
    } catch {
      setError("Davetiye güncellenemedi");
    }
  }

  async function handleWalkIn(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await checkInWalkIn(siteId, {
        visitorName: wName,
        visitorPhone: wPhone || undefined,
        idNumber: wIdNumber || undefined,
        vehiclePlate: wPlate || undefined,
        tempCardNo: wCard || undefined,
      });
      setCheckInDialogOpen(false);
      setWName("");
      setWPhone("");
      setWIdNumber("");
      setWPlate("");
      setWCard("");
      await refresh();
    } catch {
      setError("Giriş kaydı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeCheckIn(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await checkInWithCode(siteId, code, codeCard || undefined);
      setCheckInDialogOpen(false);
      setCode("");
      setCodeCard("");
      await refresh();
    } catch {
      setError("Davetiye koduyla giriş yapılamadı — kod geçersiz veya onaylanmamış olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut(logId: string) {
    try {
      await checkOut(logId);
      await refresh();
    } catch {
      setError("Çıkış kaydı yapılamadı");
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">QR Davetiyeler</Typography>
          <Button size="small" variant="contained" onClick={() => setInvDialogOpen(true)}>
            Yeni Davetiye
          </Button>
        </Box>
        {invitations.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz davetiye yok.</Typography>
        ) : (
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Ziyaretçi</TableCell>
                <TableCell>Kod</TableCell>
                <TableCell>Araç</TableCell>
                <TableCell>Geçerlilik</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.visitorName}{inv.visitorPhone ? ` — ${inv.visitorPhone}` : ""}</TableCell>
                  <TableCell>
                    <Chip label={inv.invitationCode} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{inv.vehiclePlate ?? "-"}</TableCell>
                  <TableCell>{new Date(inv.validUntil).toLocaleString("tr-TR")}'e kadar</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[inv.status]} color={STATUS_COLORS[inv.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    {inv.status === "bekliyor" && (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button size="small" color="success" onClick={() => handleDecide(inv.id, true)}>
                          Onayla
                        </Button>
                        <Button size="small" color="error" onClick={() => handleDecide(inv.id, false)}>
                          Reddet
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Giriş Çıkış Kayıtları</Typography>
          <Button size="small" variant="contained" onClick={() => setCheckInDialogOpen(true)}>
            Yeni Giriş
          </Button>
        </Box>
        {logs.length === 0 ? (
          <Typography color="text.secondary">Henüz giriş çıkış kaydı yok.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Ziyaretçi</TableCell>
                <TableCell>Araç</TableCell>
                <TableCell>Geçici Kart</TableCell>
                <TableCell>Giriş</TableCell>
                <TableCell>Çıkış</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((lg) => (
                <TableRow key={lg.id}>
                  <TableCell>{lg.visitorName}{lg.visitorPhone ? ` — ${lg.visitorPhone}` : ""}</TableCell>
                  <TableCell>{lg.vehiclePlate ?? "-"}</TableCell>
                  <TableCell>{lg.tempCardNo ?? "-"}</TableCell>
                  <TableCell>{new Date(lg.checkedInAt).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>{lg.checkedOutAt ? new Date(lg.checkedOutAt).toLocaleString("tr-TR") : "-"}</TableCell>
                  <TableCell>
                    {!lg.checkedOutAt && (
                      <Button size="small" onClick={() => handleCheckOut(lg.id)}>
                        Çıkış Yap
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={invDialogOpen} onClose={() => setInvDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateInvitation}>
          <DialogTitle>Yeni QR Davetiye</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Ziyaretçi Adı" value={invName} onChange={(e) => setInvName(e.target.value)} required autoFocus fullWidth />
            <TextField label="Telefon" value={invPhone} onChange={(e) => setInvPhone(e.target.value)} fullWidth />
            <TextField label="Araç Plakası" value={invPlate} onChange={(e) => setInvPlate(e.target.value)} fullWidth />
            <TextField
              label="Geçerlilik Bitişi"
              type="datetime-local"
              value={invValidUntil}
              onChange={(e) => setInvValidUntil(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInvDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={checkInDialogOpen} onClose={() => setCheckInDialogOpen(false)} fullWidth maxWidth="xs">
        <Tabs value={checkInTab} onChange={(_, v) => setCheckInTab(v)} sx={{ px: 2, pt: 1 }}>
          <Tab value="walkin" label="Davetiyesiz Giriş" />
          <Tab value="code" label="Davetiye Koduyla" />
        </Tabs>
        {checkInTab === "walkin" ? (
          <Box component="form" onSubmit={handleWalkIn}>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField label="Ziyaretçi Adı" value={wName} onChange={(e) => setWName(e.target.value)} required autoFocus fullWidth />
              <TextField label="Telefon" value={wPhone} onChange={(e) => setWPhone(e.target.value)} fullWidth />
              <TextField label="Kimlik No" value={wIdNumber} onChange={(e) => setWIdNumber(e.target.value)} fullWidth />
              <TextField label="Araç Plakası" value={wPlate} onChange={(e) => setWPlate(e.target.value)} fullWidth />
              <TextField label="Geçici Kart No" value={wCard} onChange={(e) => setWCard(e.target.value)} fullWidth />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCheckInDialogOpen(false)}>Vazgeç</Button>
              <Button type="submit" variant="contained" disabled={submitting}>Giriş Yap</Button>
            </DialogActions>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleCodeCheckIn}>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField label="Davetiye Kodu" value={code} onChange={(e) => setCode(e.target.value)} required autoFocus fullWidth />
              <TextField label="Geçici Kart No" value={codeCard} onChange={(e) => setCodeCard(e.target.value)} fullWidth />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCheckInDialogOpen(false)}>Vazgeç</Button>
              <Button type="submit" variant="contained" disabled={submitting}>Giriş Yap</Button>
            </DialogActions>
          </Box>
        )}
      </Dialog>
    </Box>
  );
}
