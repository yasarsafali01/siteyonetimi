import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import HomeIcon from "@mui/icons-material/Home";
import { AppShell, type ShellNavItem } from "../components/AppShell";
import { getMe } from "../api/me";
import { getPersonBalance, listChargesForUnit } from "../api/finance";
import { createRequest, listRequests } from "../api/request";
import { listCommonAreas } from "../api/sites";
import { createFacilityReservation, listFacilityReservations } from "../api/reservation";
import { createInvitation, listInvitations } from "../api/visitor";
import type { Me, Residency } from "../types/me";
import type { ChargeWithBalance, UnitBalance } from "../types/finance";
import type { RequestPriority, RequestType, ServiceRequest } from "../types/request";
import type { CommonArea } from "../types/site";
import type { FacilityReservation } from "../types/reservation";
import type { VisitorInvitation } from "../types/visitor";

const CHARGE_TYPE_LABELS: Record<string, string> = {
  aidat: "Aidat",
  ek_aidat: "Ek Aidat",
  ozel_gider: "Özel Gider",
  gecikme_faizi: "Gecikme Faizi",
  gecikme_tazminati: "Gecikme Tazminatı",
};
const REQUEST_TYPE_LABELS: Record<RequestType, string> = { ariza: "Arıza", sikayet: "Şikayet", oneri: "Öneri" };
const REQUEST_STATUS_LABELS: Record<string, string> = {
  yeni: "Yeni",
  atandi: "Atandı",
  inceleniyor: "İnceleniyor",
  cozuldu: "Çözüldü",
  kapatildi: "Kapatıldı",
};
const PRIORITY_LABELS: Record<RequestPriority, string> = { dusuk: "Düşük", normal: "Normal", yuksek: "Yüksek", acil: "Acil" };
const RESERVATION_STATUS_LABELS: Record<string, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  iptal: "İptal",
  tamamlandi: "Tamamlandı",
};
const INVITATION_STATUS_LABELS: Record<string, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  kullanildi: "Kullanıldı",
  iptal: "İptal",
};

const NAV_ITEMS: ShellNavItem[] = [{ label: "Panelim", path: "/resident", icon: <HomeIcon fontSize="small" />, end: true }];

export function ResidentDashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [activeResidency, setActiveResidency] = useState<Residency | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [balance, setBalance] = useState<UnitBalance | null>(null);
  const [charges, setCharges] = useState<ChargeWithBalance[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [commonAreas, setCommonAreas] = useState<CommonArea[]>([]);
  const [invitations, setInvitations] = useState<VisitorInvitation[]>([]);

  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqType, setReqType] = useState<RequestType>("ariza");
  const [reqTitle, setReqTitle] = useState("");
  const [reqDescription, setReqDescription] = useState("");
  const [reqPriority, setReqPriority] = useState<RequestPriority>("normal");

  const [resDialogOpen, setResDialogOpen] = useState(false);
  const [resAreaId, setResAreaId] = useState("");
  const [resStart, setResStart] = useState("");
  const [resEnd, setResEnd] = useState("");

  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [invName, setInvName] = useState("");
  const [invPhone, setInvPhone] = useState("");
  const [invValidUntil, setInvValidUntil] = useState("");

  useEffect(() => {
    getMe()
      .then((data) => {
        setMe(data);
        if (data.residencies && data.residencies.length > 0) {
          setActiveResidency(data.residencies[0]);
        }
      })
      .catch(() => setError("Kullanıcı bilgileri yüklenemedi"));
  }, []);

  async function refresh(residency: Residency, personId: string) {
    try {
      const [bal, chg, reqs, res, areas, invs] = await Promise.all([
        getPersonBalance(personId),
        listChargesForUnit(residency.unitId),
        listRequests(residency.siteId),
        listFacilityReservations(residency.siteId),
        listCommonAreas(residency.siteId),
        listInvitations(residency.siteId),
      ]);
      setBalance(bal);
      setCharges(chg);
      setRequests(reqs);
      setReservations(res.filter((r) => r.unitId === residency.unitId));
      setCommonAreas(areas);
      setInvitations(invs);
      setError(null);
    } catch {
      setError("Veriler yüklenemedi");
    }
  }

  useEffect(() => {
    if (activeResidency && me?.personId) {
      refresh(activeResidency, me.personId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResidency, me?.personId]);

  function areaName(id: string) {
    return commonAreas.find((a) => a.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreateRequest(e: FormEvent) {
    e.preventDefault();
    if (!activeResidency) return;
    setSubmitting(true);
    try {
      await createRequest(activeResidency.siteId, { type: reqType, title: reqTitle, description: reqDescription || undefined, priority: reqPriority });
      setReqDialogOpen(false);
      setReqTitle("");
      setReqDescription("");
      await refresh(activeResidency, me!.personId!);
    } catch {
      setError("Talep oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateReservation(e: FormEvent) {
    e.preventDefault();
    if (!activeResidency) return;
    setSubmitting(true);
    try {
      await createFacilityReservation(activeResidency.siteId, {
        commonAreaId: resAreaId,
        startTime: new Date(resStart).toISOString(),
        endTime: new Date(resEnd).toISOString(),
      });
      setResDialogOpen(false);
      setResAreaId("");
      await refresh(activeResidency, me!.personId!);
    } catch {
      setError("Rezervasyon oluşturulamadı — seçilen alan bu aralıkta dolu olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateInvitation(e: FormEvent) {
    e.preventDefault();
    if (!activeResidency) return;
    setSubmitting(true);
    try {
      await createInvitation(activeResidency.siteId, {
        visitorName: invName,
        visitorPhone: invPhone || undefined,
        validUntil: new Date(invValidUntil).toISOString(),
      });
      setInvDialogOpen(false);
      setInvName("");
      setInvPhone("");
      await refresh(activeResidency, me!.personId!);
    } catch {
      setError("Davetiye oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Sakin Paneli"
      subtitle={activeResidency ? `${activeResidency.siteName} — ${activeResidency.blockName} / ${activeResidency.unitNumber}` : undefined}
      navItems={NAV_ITEMS}
    >
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {me && (!me.residencies || me.residencies.length === 0) && (
          <Alert severity="info">
            Hesabınıza bağlı bir bağımsız bölüm bulunamadı. Lütfen site yönetimiyle iletişime geçin.
          </Alert>
        )}

        {me && me.residencies && me.residencies.length > 1 && (
          <TextField
            select
            size="small"
            label="Bağımsız Bölüm"
            value={activeResidency?.unitId ?? ""}
            onChange={(e) => setActiveResidency(me.residencies!.find((r) => r.unitId === e.target.value) ?? null)}
            sx={{ mb: 3, minWidth: 280 }}
          >
            {me.residencies.map((r) => (
              <MenuItem key={r.unitId} value={r.unitId}>
                {r.siteName} — {r.blockName} / {r.unitNumber}
              </MenuItem>
            ))}
          </TextField>
        )}

        {activeResidency && (
          <>
            <Chip
              size="small"
              label={activeResidency.relation === "malik" ? "Malik" : "Kiracı"}
              color="primary"
              variant="outlined"
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: "flex", gap: 2, mb: 4, flexWrap: "wrap" }}>
              <Card variant="outlined" sx={{ minWidth: 200 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Kalan Bakiye</Typography>
                  <Typography variant="h6" color={balance && balance.remainingAmount > 0 ? "warning.main" : "success.main"}>
                    {(balance?.remainingAmount ?? 0).toLocaleString("tr-TR")} ₺
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Typography variant="h6" sx={{ mb: 1 }}>Borçlarım</Typography>
            {charges.length === 0 ? (
              <Typography color="text.secondary" sx={{ mb: 4 }}>Borç kaydınız yok.</Typography>
            ) : (
              <Table size="small" sx={{ mb: 4 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Tür</TableCell>
                    <TableCell>Dönem</TableCell>
                    <TableCell>Tutar</TableCell>
                    <TableCell>Ödenen</TableCell>
                    <TableCell>Kalan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {charges.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{CHARGE_TYPE_LABELS[c.type] ?? c.type}</TableCell>
                      <TableCell>{c.period ?? "-"}</TableCell>
                      <TableCell>{c.amount.toLocaleString("tr-TR")} ₺</TableCell>
                      <TableCell>{c.paidAmount.toLocaleString("tr-TR")} ₺</TableCell>
                      <TableCell>{c.remainingAmount.toLocaleString("tr-TR")} ₺</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6">Taleplerim</Typography>
              <Button size="small" variant="contained" onClick={() => setReqDialogOpen(true)}>
                Yeni Talep
              </Button>
            </Box>
            {requests.length === 0 ? (
              <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz talebiniz yok.</Typography>
            ) : (
              <Table size="small" sx={{ mb: 4 }}>
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

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6">Rezervasyonlarım</Typography>
              <Button size="small" variant="contained" onClick={() => setResDialogOpen(true)} disabled={commonAreas.length === 0}>
                Yeni Rezervasyon
              </Button>
            </Box>
            {commonAreas.length === 0 && (
              <Typography color="text.secondary" sx={{ mb: 1 }}>Sitede henüz rezerve edilebilir ortak alan tanımlanmamış.</Typography>
            )}
            {reservations.length === 0 ? (
              <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz rezervasyonunuz yok.</Typography>
            ) : (
              <Table size="small" sx={{ mb: 4 }}>
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

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6">Ziyaretçi Davetiyelerim</Typography>
              <Button size="small" variant="contained" onClick={() => setInvDialogOpen(true)}>
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
          </>
        )}
      </Box>

      <Dialog open={reqDialogOpen} onClose={() => setReqDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateRequest}>
          <DialogTitle>Yeni Talep</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Tür" value={reqType} onChange={(e) => setReqType(e.target.value as RequestType)} fullWidth>
              {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Başlık" value={reqTitle} onChange={(e) => setReqTitle(e.target.value)} required autoFocus fullWidth />
            <TextField label="Açıklama" value={reqDescription} onChange={(e) => setReqDescription(e.target.value)} multiline minRows={2} fullWidth />
            <TextField select label="Öncelik" value={reqPriority} onChange={(e) => setReqPriority(e.target.value as RequestPriority)} fullWidth>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReqDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Gönder</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={resDialogOpen} onClose={() => setResDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateReservation}>
          <DialogTitle>Yeni Rezervasyon</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Ortak Alan" value={resAreaId} onChange={(e) => setResAreaId(e.target.value)} required autoFocus fullWidth>
              {commonAreas.map((a) => (
                <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
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

      <Dialog open={invDialogOpen} onClose={() => setInvDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateInvitation}>
          <DialogTitle>Yeni Ziyaretçi Davetiyesi</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Ziyaretçi Adı" value={invName} onChange={(e) => setInvName(e.target.value)} required autoFocus fullWidth />
            <TextField label="Telefon" value={invPhone} onChange={(e) => setInvPhone(e.target.value)} fullWidth />
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
    </AppShell>
  );
}
