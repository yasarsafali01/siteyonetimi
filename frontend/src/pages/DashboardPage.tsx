import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function DashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">Site Yönetim Platformu</Typography>
          <Button color="inherit" onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Panele hoş geldiniz</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Modüller burada listelenecek.
        </Typography>
      </Box>
    </Box>
  );
}
