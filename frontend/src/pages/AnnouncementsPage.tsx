import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { createAnnouncement, listAnnouncements } from "../api/announcement";
import type { Announcement, AnnouncementCategory } from "../types/announcement";

const CATEGORY_LABELS: Record<AnnouncementCategory, string> = { duyuru: "Duyuru", haber: "Haber" };

const CHANNEL_OPTIONS: { value: string; label: string }[] = [
  { value: "sms", label: "SMS" },
  { value: "eposta", label: "E-posta" },
  { value: "push", label: "Push Bildirim" },
  { value: "whatsapp", label: "WhatsApp" },
];

export function AnnouncementsPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("duyuru");
  const [channels, setChannels] = useState<string[]>([]);

  async function refresh() {
    if (!siteId) return;
    try {
      setAnnouncements(await listAnnouncements(siteId));
      setError(null);
    } catch {
      setError("Duyurular yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  function toggleChannel(value: string) {
    setChannels((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createAnnouncement(siteId, { title, content, category, channels: ["site_ici", ...channels] });
      setDialogOpen(false);
      setTitle("");
      setContent("");
      setChannels([]);
      await refresh();
    } catch {
      setError("Duyuru yayınlanamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Duyurular ve Haberler</Typography>
          <Button size="small" variant="contained" onClick={() => setDialogOpen(true)}>
            Yeni Duyuru
          </Button>
        </Box>

        {announcements.length === 0 ? (
          <Typography color="text.secondary">Henüz duyuru yok.</Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {announcements.map((a) => (
              <Card key={a.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle1">{a.title}</Typography>
                    <Chip label={CATEGORY_LABELS[a.category]} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.content}</Typography>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                    {a.channels.map((c) => (
                      <Chip key={c} label={c} size="small" variant="outlined" />
                    ))}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>
                      {new Date(a.publishedAt).toLocaleString("tr-TR")}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Duyuru</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus fullWidth />
            <TextField label="İçerik" value={content} onChange={(e) => setContent(e.target.value)} required multiline minRows={3} fullWidth />
            <TextField select label="Kategori" value={category} onChange={(e) => setCategory(e.target.value as AnnouncementCategory)} fullWidth>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Site içi bildirim her zaman gönderilir. Ek kanallar (gerçek gönderim entegrasyonu ileride eklenecek):
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap" }}>
                {CHANNEL_OPTIONS.map((opt) => (
                  <FormControlLabel
                    key={opt.value}
                    control={<Checkbox checked={channels.includes(opt.value)} onChange={() => toggleChannel(opt.value)} />}
                    label={opt.label}
                  />
                ))}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Yayınla</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
