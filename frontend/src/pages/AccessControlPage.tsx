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
import {
  createAccessPoint,
  createCredential,
  listAccessLogs,
  listAccessPoints,
  listCredentials,
  revokeCredential,
  scanAccessPoint,
} from "../api/access";
import type { AccessCredential, AccessCredentialType, AccessLog, AccessPoint, AccessPointType } from "../types/access";

const POINT_TYPE_LABELS: Record<AccessPointType, string> = { bariyer: "Bariyer", turnike: "Turnike", kapi: "Kapı" };
const CRED_TYPE_LABELS: Record<AccessCredentialType, string> = { qr: "QR", nfc: "NFC", kart: "Kart", plaka: "Plaka" };

export function AccessControlPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [points, setPoints] = useState<AccessPoint[]>([]);
  const [credentials, setCredentials] = useState<AccessCredential[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [pointName, setPointName] = useState("");
  const [pointType, setPointType] = useState<AccessPointType>("bariyer");

  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credType, setCredType] = useState<AccessCredentialType>("kart");
  const [credValue, setCredValue] = useState("");

  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanPointId, setScanPointId] = useState("");
  const [scanMethod, setScanMethod] = useState<AccessCredentialType>("kart");
  const [scanValue, setScanValue] = useState("");
  const [scanResult, setScanResult] = useState<AccessLog | null>(null);

  async function refresh() {
    if (!siteId) return;
    try {
      const [p, c, l] = await Promise.all([listAccessPoints(siteId), listCredentials(siteId), listAccessLogs(siteId)]);
      setPoints(p);
      setCredentials(c);
      setLogs(l);
      setError(null);
    } catch {
      setError("Geçiş kontrol verileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  function pointName_(id: string) {
    return points.find((p) => p.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreatePoint(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createAccessPoint(siteId, { name: pointName, type: pointType });
      setPointDialogOpen(false);
      setPointName("");
      await refresh();
    } catch {
      setError("Geçiş noktası oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCredential(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createCredential(siteId, { type: credType, credentialValue: credValue });
      setCredDialogOpen(false);
      setCredValue("");
      await refresh();
    } catch {
      setError("Kimlik bilgisi oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeCredential(id);
      await refresh();
    } catch {
      setError("Kimlik bilgisi iptal edilemedi");
    }
  }

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!siteId || !scanPointId) return;
    setSubmitting(true);
    try {
      const result = await scanAccessPoint(siteId, scanPointId, scanMethod, scanValue);
      setScanResult(result);
      await refresh();
    } catch {
      setError("Tarama işlenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Geçiş Noktaları</Typography>
          <Button size="small" variant="contained" onClick={() => setPointDialogOpen(true)}>
            Yeni Geçiş Noktası
          </Button>
        </Box>
        {points.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz geçiş noktası yok.</Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
            {points.map((p) => (
              <Chip key={p.id} label={`${p.name} (${POINT_TYPE_LABELS[p.type]})`} />
            ))}
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Kimlik Bilgileri (QR / NFC / Kart / Plaka)</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => setScanDialogOpen(true)} disabled={points.length === 0}>
              Tarama Simülasyonu
            </Button>
            <Button size="small" variant="contained" onClick={() => setCredDialogOpen(true)}>
              Yeni Kimlik Bilgisi
            </Button>
          </Box>
        </Box>
        {credentials.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz kimlik bilgisi yok.</Typography>
        ) : (
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Tür</TableCell>
                <TableCell>Değer</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {credentials.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{CRED_TYPE_LABELS[c.type]}</TableCell>
                  <TableCell>{c.credentialValue}</TableCell>
                  <TableCell>
                    <Chip label={c.isActive ? "Aktif" : "İptal"} color={c.isActive ? "success" : "default"} size="small" />
                  </TableCell>
                  <TableCell>
                    {c.isActive && (
                      <Button size="small" color="error" onClick={() => handleRevoke(c.id)}>
                        İptal Et
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Typography variant="h6" sx={{ mb: 1 }}>Geçiş Kayıtları</Typography>
        {logs.length === 0 ? (
          <Typography color="text.secondary">Henüz geçiş kaydı yok.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nokta</TableCell>
                <TableCell>Yöntem</TableCell>
                <TableCell>Değer</TableCell>
                <TableCell>Sonuç</TableCell>
                <TableCell>Zaman</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{pointName_(l.accessPointId)}</TableCell>
                  <TableCell>{CRED_TYPE_LABELS[l.method]}</TableCell>
                  <TableCell>{l.credentialValueSnapshot}</TableCell>
                  <TableCell>
                    <Chip label={l.granted ? "Geçiş İzni Verildi" : "Reddedildi"} color={l.granted ? "success" : "error"} size="small" />
                  </TableCell>
                  <TableCell>{new Date(l.occurredAt).toLocaleString("tr-TR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={pointDialogOpen} onClose={() => setPointDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreatePoint}>
          <DialogTitle>Yeni Geçiş Noktası</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Ad" value={pointName} onChange={(e) => setPointName(e.target.value)} required autoFocus fullWidth />
            <TextField select label="Tür" value={pointType} onChange={(e) => setPointType(e.target.value as AccessPointType)} fullWidth>
              {Object.entries(POINT_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPointDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={credDialogOpen} onClose={() => setCredDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateCredential}>
          <DialogTitle>Yeni Kimlik Bilgisi</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Tür" value={credType} onChange={(e) => setCredType(e.target.value as AccessCredentialType)} fullWidth>
              {Object.entries(CRED_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Değer (kod/no/plaka)" value={credValue} onChange={(e) => setCredValue(e.target.value)} required autoFocus fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCredDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={scanDialogOpen} onClose={() => { setScanDialogOpen(false); setScanResult(null); }} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleScan}>
          <DialogTitle>Tarama Simülasyonu</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Geçiş Noktası" value={scanPointId} onChange={(e) => setScanPointId(e.target.value)} required fullWidth>
              {points.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Yöntem" value={scanMethod} onChange={(e) => setScanMethod(e.target.value as AccessCredentialType)} fullWidth>
              {Object.entries(CRED_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Değer" value={scanValue} onChange={(e) => setScanValue(e.target.value)} required fullWidth />
            {scanResult && (
              <Alert severity={scanResult.granted ? "success" : "error"}>
                {scanResult.granted ? "Geçiş izni verildi" : "Geçiş reddedildi"}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setScanDialogOpen(false); setScanResult(null); }}>Kapat</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Tara</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
