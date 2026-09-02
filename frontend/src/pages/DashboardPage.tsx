import { AppBar, Box, Button, Card, CardActionArea, CardContent, Toolbar, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const MODULES = [
  { title: "Siteler", description: "Site, blok ve bağımsız bölüm yönetimi", path: "/sites" },
  { title: "Kişiler (CRM)", description: "Malik, kiracı ve diğer kişi kayıtları", path: "/persons" },
  { title: "Kullanıcılar", description: "Yönetici ve sakin giriş hesapları", path: "/users" },
];

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
        <Typography variant="h5" sx={{ mb: 3 }}>
          Panele hoş geldiniz
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {MODULES.map((mod) => (
            <Card key={mod.path} sx={{ width: 260 }}>
              <CardActionArea onClick={() => navigate(mod.path)}>
                <CardContent>
                  <Typography variant="h6">{mod.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {mod.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
