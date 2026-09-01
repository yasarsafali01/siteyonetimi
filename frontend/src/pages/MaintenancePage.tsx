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
  assignWorkOrder,
  completeWorkOrder,
  createFacility,
  createPlan,
  createWorkOrder,
  listDuePlans,
  listFacilities,
  listPlans,
  listWorkOrders,
} from "../api/maintenance";
import { getCurrentUserId } from "../api/client";
import type { Facility, FacilityType, MaintenancePlan, WorkOrder, WorkOrderStatus } from "../types/maintenance";

const FACILITY_TYPES: { value: FacilityType; label: string }[] = [
  { value: "asansor", label: "Asansör" },
  { value: "jenerator", label: "Jeneratör" },
  { value: "havuz", label: "Havuz" },
  { value: "yangin_sistemi", label: "Yangın Sistemi" },
  { value: "diger", label: "Diğer" },
];

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  planlandi: "Planlandı",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
};
const STATUS_COLORS: Record<WorkOrderStatus, "default" | "info" | "success" | "error"> = {
  planlandi: "default",
  devam_ediyor: "info",
  tamamlandi: "success",
  iptal: "error",
};

export function MaintenancePage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [duePlans, setDuePlans] = useState<MaintenancePlan[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [facType, setFacType] = useState<FacilityType>("asansor");
  const [facName, setFacName] = useState("");
  const [facLocation, setFacLocation] = useState("");

  const [planFacility, setPlanFacility] = useState<Facility | null>(null);
  const [facilityPlans, setFacilityPlans] = useState<MaintenancePlan[]>([]);
  const [planTitle, setPlanTitle] = useState("");
  const [planFrequency, setPlanFrequency] = useState("30");
  const [planNextDue, setPlanNextDue] = useState(new Date().toISOString().slice(0, 10));

  const [woDialogOpen, setWoDialogOpen] = useState(false);
  const [woFacilityId, setWoFacilityId] = useState("");
  const [woTitle, setWoTitle] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      const [f, dp, wo] = await Promise.all([listFacilities(siteId), listDuePlans(siteId), listWorkOrders(siteId)]);
      setFacilities(f);
      setDuePlans(dp);
      setWorkOrders(wo);
      setError(null);
    } catch {
      setError("Bakım verileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  function facilityName(id: string | null) {
    if (!id) return "-";
    return facilities.find((f) => f.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreateFacility(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createFacility(siteId, { type: facType, name: facName, location: facLocation || undefined });
      setFacilityDialogOpen(false);
      setFacName("");
      setFacLocation("");
      await refresh();
    } catch {
      setError("Tesis varlığı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function openPlans(f: Facility) {
    setPlanFacility(f);
    setFacilityPlans(await listPlans(f.id));
  }

  async function handleCreatePlan(e: FormEvent) {
    e.preventDefault();
    if (!planFacility) return;
    setSubmitting(true);
    try {
      await createPlan(planFacility.id, { title: planTitle, frequencyDays: Number(planFrequency), nextDueDate: planNextDue });
      setPlanTitle("");
      setFacilityPlans(await listPlans(planFacility.id));
      await refresh();
    } catch {
      setError("Bakım planı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateWorkOrder(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createWorkOrder(siteId, { facilityId: woFacilityId || undefined, title: woTitle });
      setWoDialogOpen(false);
      setWoTitle("");
      await refresh();
    } catch {
      setError("İş emri oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignToMe(wo: WorkOrder) {
    const uid = getCurrentUserId();
    if (!uid) return;
    try {
      await assignWorkOrder(wo.id, uid);
      await refresh();
    } catch {
      setError("Atama yapılamadı");
    }
  }

  async function handleComplete(wo: WorkOrder) {
    try {
      await completeWorkOrder(wo.id, "Tamamlandı");
      await refresh();
    } catch {
      setError("İş emri tamamlanamadı");
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {duePlans.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {duePlans.length} bakım planının vadesi geldi: {duePlans.map((p) => p.title).join(", ")}
          </Alert>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Tesis Varlıkları</Typography>
          <Button size="small" variant="contained" onClick={() => setFacilityDialogOpen(true)}>
            Yeni Tesis Varlığı
          </Button>
        </Box>
        {facilities.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz tesis varlığı eklenmedi.</Typography>
        ) : (
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Tür</TableCell>
                <TableCell>Ad</TableCell>
                <TableCell>Konum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {facilities.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{FACILITY_TYPES.find((t) => t.value === f.type)?.label ?? f.type}</TableCell>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.location ?? "-"}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openPlans(f)}>
                      Bakım Planları
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">İş Emirleri</Typography>
          <Button size="small" variant="contained" onClick={() => setWoDialogOpen(true)}>
            Yeni İş Emri
          </Button>
        </Box>
        {workOrders.length === 0 ? (
          <Typography color="text.secondary">Henüz iş emri yok.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Başlık</TableCell>
                <TableCell>Tesis</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workOrders.map((wo) => (
                <TableRow key={wo.id}>
                  <TableCell>{wo.title}</TableCell>
                  <TableCell>{facilityName(wo.facilityId)}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[wo.status]} color={STATUS_COLORS[wo.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    {wo.status !== "tamamlandi" && wo.status !== "iptal" && (
                      <>
                        {!wo.assignedTo && (
                          <Button size="small" onClick={() => handleAssignToMe(wo)}>
                            Bana Ata
                          </Button>
                        )}
                        <Button size="small" onClick={() => handleComplete(wo)}>
                          Tamamla
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={facilityDialogOpen} onClose={() => setFacilityDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateFacility}>
          <DialogTitle>Yeni Tesis Varlığı</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Tür" value={facType} onChange={(e) => setFacType(e.target.value as FacilityType)} fullWidth>
              {FACILITY_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Ad" value={facName} onChange={(e) => setFacName(e.target.value)} required fullWidth />
            <TextField label="Konum" value={facLocation} onChange={(e) => setFacLocation(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFacilityDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(planFacility)} onClose={() => setPlanFacility(null)} fullWidth maxWidth="xs">
        <DialogTitle>{planFacility?.name} — Bakım Planları</DialogTitle>
        <DialogContent>
          {facilityPlans.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>Henüz plan yok.</Typography>
          ) : (
            facilityPlans.map((p) => (
              <Typography key={p.id} variant="body2" sx={{ mb: 1 }}>
                {p.title} — her {p.frequencyDays} günde bir — sıradaki: {new Date(p.nextDueDate).toLocaleDateString("tr-TR")}
              </Typography>
            ))
          )}
          <Box component="form" onSubmit={handleCreatePlan} sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField label="Plan Başlığı" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} required fullWidth size="small" />
            <TextField
              label="Sıklık (gün)"
              type="number"
              value={planFrequency}
              onChange={(e) => setPlanFrequency(e.target.value)}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Sıradaki Vade"
              type="date"
              value={planNextDue}
              onChange={(e) => setPlanNextDue(e.target.value)}
              required
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button type="submit" variant="outlined" disabled={submitting}>
              Plan Ekle
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanFacility(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={woDialogOpen} onClose={() => setWoDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateWorkOrder}>
          <DialogTitle>Yeni İş Emri</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Tesis (opsiyonel)" value={woFacilityId} onChange={(e) => setWoFacilityId(e.target.value)} fullWidth>
              <MenuItem value="">-</MenuItem>
              {facilities.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Başlık" value={woTitle} onChange={(e) => setWoTitle(e.target.value)} required fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setWoDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
