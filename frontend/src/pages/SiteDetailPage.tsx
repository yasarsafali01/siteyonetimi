import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { createBlock, createCommonArea, listBlocks, listCommonAreas } from "../api/sites";
import type { Block, CommonArea } from "../types/site";

export function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [floorCount, setFloorCount] = useState("");

  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [areaSqm, setAreaSqm] = useState("");

  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    if (!siteId) return;
    try {
      const [blockData, areaData] = await Promise.all([listBlocks(siteId), listCommonAreas(siteId)]);
      setBlocks(blockData);
      setAreas(areaData);
      setError(null);
    } catch {
      setError("Site bilgileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function handleCreateBlock(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createBlock(siteId, {
        name: blockName,
        floorCount: floorCount ? Number(floorCount) : undefined,
      });
      setBlockDialogOpen(false);
      setBlockName("");
      setFloorCount("");
      await refresh();
    } catch {
      setError("Blok oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateArea(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createCommonArea(siteId, {
        name: areaName,
        areaSqm: areaSqm ? Number(areaSqm) : undefined,
      });
      setAreaDialogOpen(false);
      setAreaName("");
      setAreaSqm("");
      await refresh();
    } catch {
      setError("Ortak alan oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Bloklar</Typography>
              <Button variant="contained" size="small" onClick={() => setBlockDialogOpen(true)}>
                Yeni Blok
              </Button>
            </Box>
            {blocks.length === 0 && <Typography color="text.secondary">Henüz blok eklenmedi.</Typography>}
            <List>
              {blocks.map((block) => (
                <ListItemButton key={block.id} onClick={() => navigate(`/sites/${siteId}/blocks/${block.id}`)}>
                  <ListItemText
                    primary={block.name}
                    secondary={block.floorCount ? `${block.floorCount} kat` : undefined}
                  />
                </ListItemButton>
              ))}
            </List>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Ortak Alanlar</Typography>
              <Button variant="contained" size="small" onClick={() => setAreaDialogOpen(true)}>
                Yeni Ortak Alan
              </Button>
            </Box>
            {areas.length === 0 && <Typography color="text.secondary">Henüz ortak alan eklenmedi.</Typography>}
            <List>
              {areas.map((area) => (
                <ListItemButton key={area.id} disableRipple sx={{ cursor: "default" }}>
                  <ListItemText
                    primary={area.name}
                    secondary={area.areaSqm ? `${area.areaSqm} m²` : undefined}
                  />
                </ListItemButton>
              ))}
            </List>
          </Grid>
        </Grid>
      </Box>

      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateBlock}>
          <DialogTitle>Yeni Blok</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Blok Adı" value={blockName} onChange={(e) => setBlockName(e.target.value)} required autoFocus fullWidth />
            <TextField
              label="Kat Sayısı"
              type="number"
              value={floorCount}
              onChange={(e) => setFloorCount(e.target.value)}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBlockDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Kaydet
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={areaDialogOpen} onClose={() => setAreaDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateArea}>
          <DialogTitle>Yeni Ortak Alan</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Alan Adı" value={areaName} onChange={(e) => setAreaName(e.target.value)} required autoFocus fullWidth />
            <TextField
              label="Metrekare"
              type="number"
              value={areaSqm}
              onChange={(e) => setAreaSqm(e.target.value)}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAreaDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Kaydet
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
