import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { createSite, listSites } from "../api/sites";
import type { Site } from "../types/site";

export function SitesPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setSites(await listSites());
      setError(null);
    } catch {
      setError("Siteler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createSite({ name, address: address || undefined });
      setDialogOpen(false);
      setName("");
      setAddress("");
      await refresh();
    } catch {
      setError("Site oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">Siteler</Typography>
          <Button color="inherit" onClick={() => navigate("/dashboard")}>
            Panele Dön
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5">Site Listesi</Typography>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Yeni Site
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && sites.length === 0 && (
          <Typography color="text.secondary">Henüz site eklenmedi.</Typography>
        )}

        <List>
          {sites.map((site) => (
            <ListItemButton key={site.id} onClick={() => navigate(`/sites/${site.id}`)}>
              <ListItemText primary={site.name} secondary={site.address ?? undefined} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Site</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Site Adı" value={name} onChange={(e) => setName(e.target.value)} required autoFocus fullWidth />
            <TextField label="Adres" value={address} onChange={(e) => setAddress(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Kaydet
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
