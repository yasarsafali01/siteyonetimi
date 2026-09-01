import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AppBar,
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
  Toolbar,
  Typography,
} from "@mui/material";
import {
  addAttachment,
  assignRequest,
  changeRequestStatus,
  createRequest,
  listAttachments,
  listRequests,
  listStatusHistory,
} from "../api/request";
import { getCurrentUserId } from "../api/client";
import type { RequestPriority, RequestStatus, RequestType, ServiceRequest, StatusChange, Attachment } from "../types/request";

const TYPE_LABELS: Record<RequestType, string> = { ariza: "Arıza", sikayet: "Şikayet", oneri: "Öneri" };
const STATUS_LABELS: Record<RequestStatus, string> = {
  yeni: "Yeni",
  atandi: "Atandı",
  inceleniyor: "İnceleniyor",
  cozuldu: "Çözüldü",
  kapatildi: "Kapatıldı",
};
const STATUS_COLORS: Record<RequestStatus, "default" | "info" | "warning" | "success"> = {
  yeni: "default",
  atandi: "info",
  inceleniyor: "warning",
  cozuldu: "success",
  kapatildi: "default",
};
const PRIORITY_LABELS: Record<RequestPriority, string> = { dusuk: "Düşük", normal: "Normal", yuksek: "Yüksek", acil: "Acil" };

export function RequestsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [type, setType] = useState<RequestType>("ariza");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("normal");

  const [detail, setDetail] = useState<ServiceRequest | null>(null);
  const [history, setHistory] = useState<StatusChange[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      setRequests(await listRequests(siteId, statusFilter));
      setError(null);
    } catch {
      setError("Talepler yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, statusFilter]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createRequest(siteId, { type, title, description: description || undefined, priority });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      await refresh();
    } catch {
      setError("Talep oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(r: ServiceRequest) {
    setDetail(r);
    await refreshDetail(r.id);
  }

  async function refreshDetail(requestId: string) {
    const [h, a] = await Promise.all([listStatusHistory(requestId), listAttachments(requestId)]);
    setHistory(h);
    setAttachments(a);
  }

  async function handleAssignToMe() {
    if (!detail) return;
    const uid = getCurrentUserId();
    if (!uid) return;
    setSubmitting(true);
    try {
      const updated = await assignRequest(detail.id, uid);
      setDetail(updated);
      await refreshDetail(detail.id);
      await refresh();
    } catch {
      setError("Atama yapılamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(newStatus: RequestStatus) {
    if (!detail) return;
    setSubmitting(true);
    try {
      const updated = await changeRequestStatus(detail.id, newStatus, note || undefined);
      setDetail(updated);
      setNote("");
      await refreshDetail(detail.id);
      await refresh();
    } catch {
      setError("Durum güncellenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddAttachment(e: FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSubmitting(true);
    try {
      await addAttachment(detail.id, fileName, fileUrl);
      setFileName("");
      setFileUrl("");
      await refreshDetail(detail.id);
    } catch {
      setError("Ek eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">Arıza ve Talep Yönetimi</Typography>
          <Button color="inherit" onClick={() => navigate(`/sites/${siteId}`)}>
            Site Detayı
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <TextField select size="small" label="Durum Filtresi" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 200 }}>
            <MenuItem value="">Tümü</MenuItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            Yeni Talep
          </Button>
        </Box>

        {requests.length === 0 ? (
          <Typography color="text.secondary">Kayıt yok.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tür</TableCell>
                <TableCell>Başlık</TableCell>
                <TableCell>Öncelik</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{TYPE_LABELS[r.type]}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>{PRIORITY_LABELS[r.priority]}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[r.status]} color={STATUS_COLORS[r.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openDetail(r)}>
                      Detay
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Talep</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Tür" value={type} onChange={(e) => setType(e.target.value as RequestType)} fullWidth>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
            <TextField label="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={2} fullWidth />
            <TextField select label="Öncelik" value={priority} onChange={(e) => setPriority(e.target.value as RequestPriority)} fullWidth>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        <DialogTitle>{detail?.title}</DialogTitle>
        <DialogContent>
          {detail && (
            <Box sx={{ mb: 2 }}>
              <Chip label={STATUS_LABELS[detail.status]} color={STATUS_COLORS[detail.status]} size="small" sx={{ mr: 1 }} />
              <Chip label={PRIORITY_LABELS[detail.priority]} size="small" variant="outlined" />
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            {!detail?.assignedTo && (
              <Button size="small" variant="outlined" onClick={handleAssignToMe} disabled={submitting}>
                Bana Ata
              </Button>
            )}
            {detail?.status !== "inceleniyor" && (
              <Button size="small" variant="outlined" onClick={() => handleStatusChange("inceleniyor")} disabled={submitting}>
                İncelemeye Al
              </Button>
            )}
            {detail?.status !== "cozuldu" && (
              <Button size="small" variant="outlined" onClick={() => handleStatusChange("cozuldu")} disabled={submitting}>
                Çözüldü Olarak İşaretle
              </Button>
            )}
            {detail?.status !== "kapatildi" && (
              <Button size="small" variant="outlined" onClick={() => handleStatusChange("kapatildi")} disabled={submitting}>
                Kapat
              </Button>
            )}
          </Box>
          <TextField
            size="small"
            label="Not (durum değişikliği ile birlikte kaydedilir)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Durum Geçmişi</Typography>
          {history.map((h) => (
            <Typography key={h.id} variant="body2" color="text.secondary">
              {new Date(h.createdAt).toLocaleString("tr-TR")} — {STATUS_LABELS[h.toStatus]}
              {h.note ? ` (${h.note})` : ""}
            </Typography>
          ))}

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Ekler (Dosya / Fotoğraf)</Typography>
          {attachments.map((a) => (
            <Typography key={a.id} variant="body2">
              <a href={a.fileUrl} target="_blank" rel="noreferrer">
                {a.fileName}
              </a>
            </Typography>
          ))}
          <Box component="form" onSubmit={handleAddAttachment} sx={{ display: "flex", gap: 1, mt: 1 }}>
            <TextField size="small" label="Dosya Adı" value={fileName} onChange={(e) => setFileName(e.target.value)} required />
            <TextField size="small" label="URL" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} required sx={{ flexGrow: 1 }} />
            <Button type="submit" size="small" variant="outlined" disabled={submitting}>
              Ekle
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
