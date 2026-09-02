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
  cancelParkingReservation,
  checkInVehicle,
  checkOutVehicle,
  createParkingReservation,
  createParkingSpot,
  listParkingReservations,
  listParkingSpots,
  listVehicleRecords,
} from "../api/parking";
import type { ParkingOwnerType, ParkingReservation, ParkingSpot, ParkingSpotType, ParkingVehicleRecord } from "../types/parking";

const SPOT_TYPE_LABELS: Record<ParkingSpotType, string> = { sakin: "Sakin", misafir: "Misafir", engelli: "Engelli" };

export function ParkingPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [records, setRecords] = useState<ParkingVehicleRecord[]>([]);
  const [reservations, setReservations] = useState<ParkingReservation[]>([]);
  const [plateQuery, setPlateQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [spotDialogOpen, setSpotDialogOpen] = useState(false);
  const [spotNumber, setSpotNumber] = useState("");
  const [spotType, setSpotType] = useState<ParkingSpotType>("sakin");

  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [ownerType, setOwnerType] = useState<ParkingOwnerType>("sakin");
  const [checkInSpotId, setCheckInSpotId] = useState("");

  const [resDialogOpen, setResDialogOpen] = useState(false);
  const [resSpotId, setResSpotId] = useState("");
  const [resStart, setResStart] = useState("");
  const [resEnd, setResEnd] = useState("");

  function spotLabel(id: string | null) {
    if (!id) return "-";
    return spots.find((s) => s.id === id)?.spotNumber ?? id.slice(0, 8);
  }

  async function refresh(plate?: string) {
    if (!siteId) return;
    try {
      const [sp, rec, res] = await Promise.all([
        listParkingSpots(siteId),
        listVehicleRecords(siteId, plate),
        listParkingReservations(siteId),
      ]);
      setSpots(sp);
      setRecords(rec);
      setReservations(res);
      setError(null);
    } catch {
      setError("Otopark verileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function handleCreateSpot(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createParkingSpot(siteId, { spotNumber, spotType });
      setSpotDialogOpen(false);
      setSpotNumber("");
      await refresh();
    } catch {
      setError("Park alanı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckIn(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await checkInVehicle(siteId, { plate, ownerType, spotId: checkInSpotId || undefined });
      setCheckInDialogOpen(false);
      setPlate("");
      setCheckInSpotId("");
      await refresh();
    } catch {
      setError("Araç girişi kaydedilemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut(id: string) {
    try {
      await checkOutVehicle(id);
      await refresh();
    } catch {
      setError("Araç çıkışı kaydedilemedi");
    }
  }

  async function handleCreateReservation(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createParkingReservation(siteId, {
        spotId: resSpotId,
        startTime: new Date(resStart).toISOString(),
        endTime: new Date(resEnd).toISOString(),
      });
      setResDialogOpen(false);
      setResSpotId("");
      await refresh();
    } catch {
      setError("Rezervasyon oluşturulamadı — seçilen alan bu aralıkta dolu olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelReservation(id: string) {
    try {
      await cancelParkingReservation(id);
      await refresh();
    } catch {
      setError("Rezervasyon iptal edilemedi");
    }
  }

  async function handlePlateSearch(e: FormEvent) {
    e.preventDefault();
    await refresh(plateQuery || undefined);
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Park Alanları</Typography>
          <Button size="small" variant="contained" onClick={() => setSpotDialogOpen(true)}>
            Yeni Park Alanı
          </Button>
        </Box>
        {spots.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz park alanı yok.</Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
            {spots.map((s) => (
              <Chip key={s.id} label={`${s.spotNumber} (${SPOT_TYPE_LABELS[s.spotType]})`} />
            ))}
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Araç Kayıtları</Typography>
          <Button size="small" variant="contained" onClick={() => setCheckInDialogOpen(true)}>
            Araç Girişi
          </Button>
        </Box>
        <Box component="form" onSubmit={handlePlateSearch} sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField size="small" label="Plaka Sorgula" value={plateQuery} onChange={(e) => setPlateQuery(e.target.value)} />
          <Button size="small" type="submit">Ara</Button>
        </Box>
        {records.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Kayıt bulunamadı.</Typography>
        ) : (
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Plaka</TableCell>
                <TableCell>Tür</TableCell>
                <TableCell>Alan</TableCell>
                <TableCell>Giriş</TableCell>
                <TableCell>Çıkış</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.plate}</TableCell>
                  <TableCell>{r.ownerType === "sakin" ? "Sakin" : "Misafir"}</TableCell>
                  <TableCell>{spotLabel(r.spotId)}</TableCell>
                  <TableCell>{new Date(r.enteredAt).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>{r.exitedAt ? new Date(r.exitedAt).toLocaleString("tr-TR") : "-"}</TableCell>
                  <TableCell>
                    {!r.exitedAt && (
                      <Button size="small" onClick={() => handleCheckOut(r.id)}>Çıkış Yap</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Park Rezervasyonları</Typography>
          <Button size="small" variant="contained" onClick={() => setResDialogOpen(true)} disabled={spots.length === 0}>
            Yeni Rezervasyon
          </Button>
        </Box>
        {reservations.length === 0 ? (
          <Typography color="text.secondary">Henüz rezervasyon yok.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Alan</TableCell>
                <TableCell>Başlangıç</TableCell>
                <TableCell>Bitiş</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{spotLabel(r.spotId)}</TableCell>
                  <TableCell>{new Date(r.startTime).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>{new Date(r.endTime).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>
                    <Chip label={r.status} size="small" color={r.status === "aktif" ? "success" : "default"} />
                  </TableCell>
                  <TableCell>
                    {r.status === "aktif" && (
                      <Button size="small" color="error" onClick={() => handleCancelReservation(r.id)}>İptal Et</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={spotDialogOpen} onClose={() => setSpotDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateSpot}>
          <DialogTitle>Yeni Park Alanı</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Alan No" value={spotNumber} onChange={(e) => setSpotNumber(e.target.value)} required autoFocus fullWidth />
            <TextField select label="Tür" value={spotType} onChange={(e) => setSpotType(e.target.value as ParkingSpotType)} fullWidth>
              {Object.entries(SPOT_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSpotDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={checkInDialogOpen} onClose={() => setCheckInDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCheckIn}>
          <DialogTitle>Araç Girişi</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Plaka" value={plate} onChange={(e) => setPlate(e.target.value)} required autoFocus fullWidth />
            <TextField select label="Sahip Türü" value={ownerType} onChange={(e) => setOwnerType(e.target.value as ParkingOwnerType)} fullWidth>
              <MenuItem value="sakin">Sakin</MenuItem>
              <MenuItem value="misafir">Misafir</MenuItem>
            </TextField>
            <TextField select label="Park Alanı (opsiyonel)" value={checkInSpotId} onChange={(e) => setCheckInSpotId(e.target.value)} fullWidth>
              <MenuItem value="">Seçilmedi</MenuItem>
              {spots.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.spotNumber}</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCheckInDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={resDialogOpen} onClose={() => setResDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateReservation}>
          <DialogTitle>Yeni Park Rezervasyonu</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Park Alanı" value={resSpotId} onChange={(e) => setResSpotId(e.target.value)} required fullWidth>
              {spots.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.spotNumber}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Başlangıç"
              type="datetime-local"
              value={resStart}
              onChange={(e) => setResStart(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Bitiş"
              type="datetime-local"
              value={resEnd}
              onChange={(e) => setResEnd(e.target.value)}
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
