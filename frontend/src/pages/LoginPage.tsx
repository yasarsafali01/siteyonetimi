import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { getCurrentUserType } from "../api/client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(getCurrentUserType() === "sakin" ? "/resident" : "/dashboard");
    } catch {
      setError("E-posta veya şifre hatalı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        bgcolor: "#f5f5f5",
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: 360 }}>
        <Typography variant="h5" sx={{ mb: 3, textAlign: "center" }}>
          Site Yönetim Platformu
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label="E-posta"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Şifre"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={submitting}>
            Giriş Yap
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
