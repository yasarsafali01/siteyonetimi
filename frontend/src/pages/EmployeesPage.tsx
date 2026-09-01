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
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { createEmployee, listEmployees } from "../api/hr";
import type { Employee } from "../types/hr";

export function EmployeesPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      setEmployees(await listEmployees(siteId));
      setError(null);
    } catch {
      setError("Personel listesi yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createEmployee(siteId, { firstName, lastName, position: position || undefined, phone: phone || undefined });
      setDialogOpen(false);
      setFirstName("");
      setLastName("");
      setPosition("");
      setPhone("");
      await refresh();
    } catch {
      setError("Personel oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5">Personel</Typography>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Yeni Personel
          </Button>
        </Box>

        {employees.length === 0 ? (
          <Typography color="text.secondary">Henüz personel eklenmedi.</Typography>
        ) : (
          <List>
            {employees.map((emp) => (
              <ListItemButton key={emp.id} onClick={() => navigate(`/sites/${siteId}/employees/${emp.id}`)}>
                <ListItemText primary={`${emp.firstName} ${emp.lastName}`} secondary={emp.position ?? undefined} />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Personel</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Ad" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus fullWidth />
            <TextField label="Soyad" value={lastName} onChange={(e) => setLastName(e.target.value)} required fullWidth />
            <TextField label="Görev" value={position} onChange={(e) => setPosition(e.target.value)} fullWidth />
            <TextField label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
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
