import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { createPerson, listPersons } from "../api/crm";
import type { Person } from "../types/crm";

export function PersonsPage() {
  const navigate = useNavigate();
  const [persons, setPersons] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");

  async function refresh(q = search) {
    try {
      setPersons(await listPersons(q));
      setError(null);
    } catch {
      setError("Kişiler yüklenemedi");
    }
  }

  useEffect(() => {
    refresh("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createPerson({
        firstName,
        lastName,
        phone: phone || undefined,
        nationalId: nationalId || undefined,
      });
      setDialogOpen(false);
      setFirstName("");
      setLastName("");
      setPhone("");
      setNationalId("");
      await refresh();
    } catch {
      setError("Kişi oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  function initials(p: Person) {
    return `${p.firstName[0] ?? ""}${p.lastName[0] ?? ""}`.toUpperCase();
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2, flexWrap: "wrap" }}>
        <TextField
          label="Ara (ad, soyad, TC no)"
          size="small"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            refresh(e.target.value);
          }}
          sx={{ flexGrow: 1, maxWidth: 360 }}
        />
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setDialogOpen(true)}>
          Yeni Kişi
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {persons.length === 0 ? (
        <Typography color="text.secondary">Henüz kişi eklenmedi.</Typography>
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {persons.map((person, i) => (
              <ListItemButton
                key={person.id}
                onClick={() => navigate(`/persons/${person.id}`)}
                divider={i < persons.length - 1}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "primary.light" }}>{initials(person)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${person.firstName} ${person.lastName}`}
                  secondary={[person.phone, person.email].filter(Boolean).join(" · ") || undefined}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Kişi</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Ad" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus fullWidth />
            <TextField label="Soyad" value={lastName} onChange={(e) => setLastName(e.target.value)} required fullWidth />
            <TextField label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
            <TextField label="TC Kimlik No" value={nationalId} onChange={(e) => setNationalId(e.target.value)} fullWidth />
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
