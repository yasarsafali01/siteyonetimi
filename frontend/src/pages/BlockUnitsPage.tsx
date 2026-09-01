import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  AppBar,
  Box,
  Button,
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
import { createUnit, listUnits } from "../api/sites";
import type { Unit, UnitType } from "../types/site";

const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: "daire", label: "Daire" },
  { value: "dukkan", label: "Dükkan" },
  { value: "ofis", label: "Ofis" },
];

export function BlockUnitsPage() {
  const { siteId, blockId } = useParams<{ siteId: string; blockId: string }>();
  const navigate = useNavigate();

  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [unitNumber, setUnitNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [type, setType] = useState<UnitType>("daire");
  const [grossSqm, setGrossSqm] = useState("");
  const [duesCoefficient, setDuesCoefficient] = useState("1");

  async function refresh() {
    if (!blockId) return;
    try {
      setUnits(await listUnits(blockId));
      setError(null);
    } catch {
      setError("Bağımsız bölümler yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!blockId) return;
    setSubmitting(true);
    try {
      await createUnit(blockId, {
        unitNumber,
        floor: floor ? Number(floor) : undefined,
        type,
        grossSqm: grossSqm ? Number(grossSqm) : undefined,
        duesCoefficient: duesCoefficient ? Number(duesCoefficient) : undefined,
      });
      setDialogOpen(false);
      setUnitNumber("");
      setFloor("");
      setGrossSqm("");
      setDuesCoefficient("1");
      await refresh();
    } catch {
      setError("Bağımsız bölüm oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">Bağımsız Bölümler</Typography>
          <Button color="inherit" onClick={() => navigate(`/sites/${siteId}`)}>
            Site Detayı
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5">Bağımsız Bölüm Listesi</Typography>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Yeni Bağımsız Bölüm
          </Button>
        </Box>

        {units.length === 0 ? (
          <Typography color="text.secondary">Henüz bağımsız bölüm eklenmedi.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>No</TableCell>
                <TableCell>Kat</TableCell>
                <TableCell>Tür</TableCell>
                <TableCell>Brüt m²</TableCell>
                <TableCell>Aidat Katsayısı</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>{unit.unitNumber}</TableCell>
                  <TableCell>{unit.floor ?? "-"}</TableCell>
                  <TableCell>{UNIT_TYPES.find((t) => t.value === unit.type)?.label ?? unit.type}</TableCell>
                  <TableCell>{unit.grossSqm ?? "-"}</TableCell>
                  <TableCell>{unit.duesCoefficient}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Bağımsız Bölüm</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Bağımsız Bölüm No" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} required autoFocus fullWidth />
            <TextField label="Kat" type="number" value={floor} onChange={(e) => setFloor(e.target.value)} fullWidth />
            <TextField select label="Tür" value={type} onChange={(e) => setType(e.target.value as UnitType)} fullWidth>
              {UNIT_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Brüt m²" type="number" value={grossSqm} onChange={(e) => setGrossSqm(e.target.value)} fullWidth />
            <TextField
              label="Aidat Katsayısı"
              type="number"
              value={duesCoefficient}
              onChange={(e) => setDuesCoefficient(e.target.value)}
              fullWidth
            />
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
