import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ApartmentIcon from "@mui/icons-material/Apartment";
import PlaceIcon from "@mui/icons-material/Place";
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
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5">Site Listesi</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Yeni Site
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && sites.length === 0 && (
        <Typography color="text.secondary">Henüz site eklenmedi.</Typography>
      )}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5 }}>
        {sites.map((site) => (
          <Card key={site.id} sx={{ width: 280 }}>
            <CardActionArea onClick={() => navigate(`/sites/${site.id}`)} sx={{ p: 1 }}>
              <CardContent>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 1.5,
                  }}
                >
                  <ApartmentIcon fontSize="small" />
                </Box>
                <Typography variant="h6" noWrap>{site.name}</Typography>
                {site.address && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, color: "text.secondary" }}>
                    <PlaceIcon fontSize="inherit" />
                    <Typography variant="body2" noWrap>{site.address}</Typography>
                  </Box>
                )}
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
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
