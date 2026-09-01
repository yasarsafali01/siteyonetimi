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
  completePatrol,
  createCheckpoint,
  createIncident,
  createSecurityShift,
  listCheckpoints,
  listIncidents,
  listPatrols,
  listScans,
  listSecurityShifts,
  scanCheckpoint,
  startPatrol,
} from "../api/security";
import type { Checkpoint, Incident, IncidentSeverity, Patrol, PatrolScan, SecurityShift } from "../types/security";

const SEVERITY_LABELS: Record<IncidentSeverity, string> = { dusuk: "Düşük", orta: "Orta", yuksek: "Yüksek", kritik: "Kritik" };
const SEVERITY_COLORS: Record<IncidentSeverity, "default" | "warning" | "error"> = { dusuk: "default", orta: "warning", yuksek: "error", kritik: "error" };

export function SecurityPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [shifts, setShifts] = useState<SecurityShift[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [cpDialogOpen, setCpDialogOpen] = useState(false);
  const [cpName, setCpName] = useState("");

  const [patrolDetail, setPatrolDetail] = useState<Patrol | null>(null);
  const [scans, setScans] = useState<PatrolScan[]>([]);

  const [incDialogOpen, setIncDialogOpen] = useState(false);
  const [incTitle, setIncTitle] = useState("");
  const [incSeverity, setIncSeverity] = useState<IncidentSeverity>("dusuk");
  const [incCameraNote, setIncCameraNote] = useState("");

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftStart, setShiftStart] = useState("00:00");
  const [shiftEnd, setShiftEnd] = useState("08:00");

  async function refresh() {
    if (!siteId) return;
    try {
      const [cp, pt, inc, sh] = await Promise.all([
        listCheckpoints(siteId),
        listPatrols(siteId),
        listIncidents(siteId),
        listSecurityShifts(siteId),
      ]);
      setCheckpoints(cp);
      setPatrols(pt);
      setIncidents(inc);
      setShifts(sh);
      setError(null);
    } catch {
      setError("Güvenlik verileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  function checkpointName(id: string) {
    return checkpoints.find((c) => c.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreateCheckpoint(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createCheckpoint(siteId, { name: cpName });
      setCpDialogOpen(false);
      setCpName("");
      await refresh();
    } catch {
      setError("Kontrol noktası oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartPatrol() {
    if (!siteId) return;
    try {
      const p = await startPatrol(siteId);
      await refresh();
      setPatrolDetail(p);
      setScans([]);
    } catch {
      setError("Devriye başlatılamadı");
    }
  }

  async function handleScan(checkpointId: string) {
    if (!patrolDetail) return;
    try {
      await scanCheckpoint(patrolDetail.id, checkpointId);
      setScans(await listScans(patrolDetail.id));
    } catch {
      setError("Kontrol noktası taranamadı");
    }
  }

  async function handleCompletePatrol() {
    if (!patrolDetail) return;
    try {
      await completePatrol(patrolDetail.id, "Tur tamamlandı");
      await refresh();
      setPatrolDetail(null);
    } catch {
      setError("Devriye tamamlanamadı");
    }
  }

  async function handleCreateIncident(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createIncident(siteId, { title: incTitle, severity: incSeverity, cameraNote: incCameraNote || undefined });
      setIncDialogOpen(false);
      setIncTitle("");
      setIncCameraNote("");
      await refresh();
    } catch {
      setError("Olay kaydı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateShift(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createSecurityShift(siteId, { shiftDate, startTime: shiftStart, endTime: shiftEnd });
      setShiftDialogOpen(false);
      await refresh();
    } catch {
      setError("Vardiya oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Tur Kontrol Noktaları</Typography>
          <Button size="small" variant="contained" onClick={() => setCpDialogOpen(true)}>
            Yeni Kontrol Noktası
          </Button>
        </Box>
        {checkpoints.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz kontrol noktası yok.</Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
            {checkpoints.map((c) => (
              <Chip key={c.id} label={c.name} />
            ))}
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Devriye Turları</Typography>
          <Button size="small" variant="contained" onClick={handleStartPatrol} disabled={checkpoints.length === 0}>
            Devriye Başlat
          </Button>
        </Box>
        {patrols.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz devriye kaydı yok.</Typography>
        ) : (
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Başlangıç</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {patrols.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.startedAt).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>{p.completedAt ? "Tamamlandı" : "Devam Ediyor"}</TableCell>
                  <TableCell>
                    {!p.completedAt && (
                      <Button
                        size="small"
                        onClick={async () => {
                          setPatrolDetail(p);
                          setScans(await listScans(p.id));
                        }}
                      >
                        Yönet
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Olay Kayıtları</Typography>
          <Button size="small" variant="contained" onClick={() => setIncDialogOpen(true)}>
            Yeni Olay Kaydı
          </Button>
        </Box>
        {incidents.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz olay kaydı yok.</Typography>
        ) : (
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Başlık</TableCell>
                <TableCell>Önem</TableCell>
                <TableCell>Kamera Notu</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {incidents.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell>{inc.title}</TableCell>
                  <TableCell>
                    <Chip label={SEVERITY_LABELS[inc.severity]} color={SEVERITY_COLORS[inc.severity]} size="small" />
                  </TableCell>
                  <TableCell>{inc.cameraNote ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Vardiya Takibi</Typography>
          <Button size="small" variant="contained" onClick={() => setShiftDialogOpen(true)}>
            Yeni Vardiya
          </Button>
        </Box>
        {shifts.length === 0 ? (
          <Typography color="text.secondary">Henüz vardiya kaydı yok.</Typography>
        ) : (
          shifts.map((s) => (
            <Typography key={s.id} variant="body2" color="text.secondary">
              {new Date(s.shiftDate).toLocaleDateString("tr-TR")} {s.startTime.slice(0, 5)} - {s.endTime.slice(0, 5)}
            </Typography>
          ))
        )}
      </Box>

      <Dialog open={cpDialogOpen} onClose={() => setCpDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateCheckpoint}>
          <DialogTitle>Yeni Kontrol Noktası</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <TextField label="Ad" value={cpName} onChange={(e) => setCpName(e.target.value)} required autoFocus fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCpDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(patrolDetail)} onClose={() => setPatrolDetail(null)} fullWidth maxWidth="xs">
        <DialogTitle>Devriye Yönetimi</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Taranan Noktalar</Typography>
          {scans.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>Henüz nokta taranmadı.</Typography>
          ) : (
            scans.map((s) => (
              <Typography key={s.id} variant="body2">
                {checkpointName(s.checkpointId)} — {new Date(s.scannedAt).toLocaleTimeString("tr-TR")}
              </Typography>
            ))
          )}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
            {checkpoints.map((c) => (
              <Button key={c.id} size="small" variant="outlined" onClick={() => handleScan(c.id)}>
                {c.name} Tara
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPatrolDetail(null)}>Kapat</Button>
          <Button variant="contained" onClick={handleCompletePatrol}>
            Devriyeyi Tamamla
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={incDialogOpen} onClose={() => setIncDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateIncident}>
          <DialogTitle>Yeni Olay Kaydı</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Başlık" value={incTitle} onChange={(e) => setIncTitle(e.target.value)} required autoFocus fullWidth />
            <TextField select label="Önem Derecesi" value={incSeverity} onChange={(e) => setIncSeverity(e.target.value as IncidentSeverity)} fullWidth>
              {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Kamera Notu" value={incCameraNote} onChange={(e) => setIncCameraNote(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIncDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={shiftDialogOpen} onClose={() => setShiftDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateShift}>
          <DialogTitle>Yeni Vardiya</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Tarih"
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField label="Başlangıç (SS:DD)" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} required fullWidth />
            <TextField label="Bitiş (SS:DD)" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} required fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShiftDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
