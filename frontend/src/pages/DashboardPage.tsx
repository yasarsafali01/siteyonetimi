import { Box, Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ApartmentIcon from "@mui/icons-material/Apartment";
import PeopleIcon from "@mui/icons-material/People";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";

const MODULES = [
  { title: "Siteler", description: "Site, blok ve bağımsız bölüm yönetimi", path: "/sites", icon: <ApartmentIcon fontSize="large" color="primary" /> },
  { title: "Kişiler (CRM)", description: "Malik, kiracı ve diğer kişi kayıtları", path: "/persons", icon: <PeopleIcon fontSize="large" color="primary" /> },
  { title: "Kullanıcılar", description: "Yönetici ve sakin giriş hesapları", path: "/users", icon: <ManageAccountsIcon fontSize="large" color="primary" /> },
];

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Panele hoş geldiniz
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5 }}>
        {MODULES.map((mod) => (
          <Card key={mod.path} sx={{ width: 260 }}>
            <CardActionArea onClick={() => navigate(mod.path)} sx={{ p: 1 }}>
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {mod.icon}
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
  );
}
