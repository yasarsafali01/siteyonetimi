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
import { createDocument, deleteDocument, listDocuments } from "../api/document";
import type { DocumentCategory, SiteDocument } from "../types/document";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  karar_defteri: "Karar Defteri",
  tutanak: "Tutanak",
  sozlesme: "Sözleşme",
  ruhsat: "Ruhsat",
  sigorta_policesi: "Sigorta Poliçesi",
  fatura: "Fatura",
  diger: "Diğer",
};

export function DocumentsPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [documents, setDocuments] = useState<SiteDocument[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>("sozlesme");
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [description, setDescription] = useState("");
  const [validUntil, setValidUntil] = useState("");

  async function refresh(filter?: DocumentCategory | "") {
    if (!siteId) return;
    try {
      setDocuments(await listDocuments(siteId, filter || undefined));
      setError(null);
    } catch {
      setError("Belgeler yüklenemedi");
    }
  }

  useEffect(() => {
    refresh(categoryFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function handleFilterChange(value: DocumentCategory | "") {
    setCategoryFilter(value);
    await refresh(value);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createDocument(siteId, {
        category,
        title,
        fileUrl,
        description: description || undefined,
        validUntil: validUntil || undefined,
      });
      setDialogOpen(false);
      setTitle("");
      setFileUrl("");
      setDescription("");
      setValidUntil("");
      await refresh(categoryFilter);
    } catch {
      setError("Belge eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id);
      await refresh(categoryFilter);
    } catch {
      setError("Belge silinemedi");
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Dokümanlar</Typography>
          <Button size="small" variant="contained" onClick={() => setDialogOpen(true)}>
            Yeni Belge
          </Button>
        </Box>

        <TextField
          select
          size="small"
          label="Kategori Filtrele"
          value={categoryFilter}
          onChange={(e) => handleFilterChange(e.target.value as DocumentCategory | "")}
          sx={{ mb: 2, minWidth: 220 }}
        >
          <MenuItem value="">Tümü</MenuItem>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>{label}</MenuItem>
          ))}
        </TextField>

        {documents.length === 0 ? (
          <Typography color="text.secondary">Henüz belge yok.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Başlık</TableCell>
                <TableCell>Kategori</TableCell>
                <TableCell>Geçerlilik</TableCell>
                <TableCell>Eklenme</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <a href={d.fileUrl} target="_blank" rel="noreferrer">{d.title}</a>
                  </TableCell>
                  <TableCell>
                    <Chip label={CATEGORY_LABELS[d.category]} size="small" />
                  </TableCell>
                  <TableCell>{d.validUntil ? new Date(d.validUntil).toLocaleDateString("tr-TR") : "-"}</TableCell>
                  <TableCell>{new Date(d.createdAt).toLocaleDateString("tr-TR")}</TableCell>
                  <TableCell>
                    <Button size="small" color="error" onClick={() => handleDelete(d.id)}>Sil</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Belge</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Kategori" value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)} fullWidth>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus fullWidth />
            <TextField label="Dosya URL" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} required fullWidth />
            <TextField label="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />
            <TextField
              label="Geçerlilik Tarihi (ruhsat/poliçe için)"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
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
