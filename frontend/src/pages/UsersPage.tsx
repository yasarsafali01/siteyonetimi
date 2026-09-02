import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
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
import { createUser, listUsers } from "../api/users";
import type { AppUser, UserType } from "../types/user";

const TYPE_LABELS: Record<UserType, string> = { yonetici: "Yönetici", sakin: "Sakin" };

export function UsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState<UserType>("yonetici");
  const [personId, setPersonId] = useState("");

  async function refresh() {
    try {
      setUsers(await listUsers());
      setError(null);
    } catch {
      setError("Kullanıcılar yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createUser({
        email,
        password,
        fullName,
        userType,
        personId: userType === "sakin" ? personId : undefined,
      });
      setDialogOpen(false);
      setEmail("");
      setPassword("");
      setFullName("");
      setPersonId("");
      await refresh();
    } catch {
      setError("Kullanıcı oluşturulamadı — e-posta zaten kullanılıyor veya sakin için kişi id'si geçersiz olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">Kullanıcılar</Typography>
          <Button color="inherit" onClick={() => navigate("/dashboard")}>
            Panele Dön
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Yönetici hesapları web panelinin tamamına erişebilir. Sakin hesapları bir kişiye (kat maliki/kiracı) bağlıdır
          ve sadece kendi bağımsız bölümlerine ait borç/talep/rezervasyon/ziyaretçi verilerine erişebilir — sakin için
          giriş hesabı açmanın en kolay yolu ilgili kişinin detay sayfasındaki "Sakin Giriş Hesabı Oluştur" butonudur.
        </Typography>

        <Button variant="contained" sx={{ mb: 2 }} onClick={() => setDialogOpen(true)}>
          Yeni Kullanıcı
        </Button>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ad Soyad</TableCell>
              <TableCell>E-posta</TableCell>
              <TableCell>Tip</TableCell>
              <TableCell>Durum</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.fullName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={u.isSuperAdmin ? "Süper Admin" : TYPE_LABELS[u.userType]}
                    color={u.userType === "yonetici" ? "primary" : "default"}
                  />
                </TableCell>
                <TableCell>{u.isActive ? "Aktif" : "Pasif"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Kullanıcı</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Ad Soyad" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus fullWidth />
            <TextField label="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
            <TextField label="Şifre" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth helperText="En az 8 karakter" />
            <TextField select label="Kullanıcı Tipi" value={userType} onChange={(e) => setUserType(e.target.value as UserType)} fullWidth>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            {userType === "sakin" && (
              <TextField
                label="Kişi (Person) ID"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                required
                fullWidth
                helperText="Kişiler sayfasından ilgili kişinin id'sini kopyalayın, ya da Kişi Detayı sayfasından doğrudan oluşturun"
              />
            )}
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
