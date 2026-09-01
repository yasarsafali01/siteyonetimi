import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Autocomplete,
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
import DeleteIcon from "@mui/icons-material/Delete";
import { createUnit, listUnits } from "../api/sites";
import { createUnitResident, deactivateUnitResident, getPerson, listPersons, listUnitResidents } from "../api/crm";
import type { Unit, UnitType } from "../types/site";
import type { Person, UnitResident } from "../types/crm";

const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: "daire", label: "Daire" },
  { value: "dukkan", label: "Dükkan" },
  { value: "ofis", label: "Ofis" },
];

interface ResidentRow extends UnitResident {
  personName: string;
}

export function BlockUnitsPage() {
  const { blockId } = useParams<{ siteId: string; blockId: string }>();

  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [unitNumber, setUnitNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [type, setType] = useState<UnitType>("daire");
  const [grossSqm, setGrossSqm] = useState("");
  const [duesCoefficient, setDuesCoefficient] = useState("1");

  const [residentsUnit, setResidentsUnit] = useState<Unit | null>(null);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [personOptions, setPersonOptions] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [relation, setRelation] = useState<"malik" | "kiraci">("malik");

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

  async function openResidents(unit: Unit) {
    setResidentsUnit(unit);
    setSelectedPerson(null);
    await refreshResidents(unit.id);
  }

  async function refreshResidents(unitId: string) {
    const list = await listUnitResidents(unitId);
    const enriched = await Promise.all(
      list.map(async (r) => {
        try {
          const p = await getPerson(r.personId);
          return { ...r, personName: `${p.firstName} ${p.lastName}` };
        } catch {
          return { ...r, personName: "Bilinmiyor" };
        }
      })
    );
    setResidents(enriched);
  }

  async function handlePersonSearch(query: string) {
    if (!query) {
      setPersonOptions([]);
      return;
    }
    setPersonOptions(await listPersons(query));
  }

  async function handleAddResident() {
    if (!residentsUnit || !selectedPerson) return;
    await createUnitResident(residentsUnit.id, { personId: selectedPerson.id, relation });
    setSelectedPerson(null);
    await refreshResidents(residentsUnit.id);
  }

  async function handleRemoveResident(id: string) {
    if (!residentsUnit) return;
    await deactivateUnitResident(id);
    await refreshResidents(residentsUnit.id);
  }

  return (
    <Box>
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
                <TableCell>Sakinler</TableCell>
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
                  <TableCell>
                    <Button size="small" onClick={() => openResidents(unit)}>
                      Yönet
                    </Button>
                  </TableCell>
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

      <Dialog open={Boolean(residentsUnit)} onClose={() => setResidentsUnit(null)} fullWidth maxWidth="sm">
        <DialogTitle>{residentsUnit?.unitNumber} No'lu Bağımsız Bölüm — Sakinler</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            {residents.length === 0 && <Typography color="text.secondary">Henüz sakin atanmadı.</Typography>}
            {residents.map((r) => (
              <Chip
                key={r.id}
                label={`${r.relation === "malik" ? "Malik" : "Kiracı"}: ${r.personName}`}
                onDelete={() => handleRemoveResident(r.id)}
                deleteIcon={<DeleteIcon />}
              />
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Autocomplete
              sx={{ flexGrow: 1 }}
              options={personOptions}
              getOptionLabel={(p) => `${p.firstName} ${p.lastName}`}
              value={selectedPerson}
              onChange={(_, value) => setSelectedPerson(value)}
              onInputChange={(_, value) => handlePersonSearch(value)}
              renderInput={(params) => <TextField {...params} label="Kişi Ara" size="small" />}
              isOptionEqualToValue={(a, b) => a.id === b.id}
            />
            <TextField select label="İlişki" size="small" value={relation} onChange={(e) => setRelation(e.target.value as "malik" | "kiraci")} sx={{ width: 140 }}>
              <MenuItem value="malik">Malik</MenuItem>
              <MenuItem value="kiraci">Kiracı</MenuItem>
            </TextField>
            <Button variant="outlined" onClick={handleAddResident} disabled={!selectedPerson}>
              Ekle
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResidentsUnit(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
