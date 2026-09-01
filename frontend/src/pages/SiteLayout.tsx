import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Button,
} from "@mui/material";
import { getSite } from "../api/sites";
import type { Site } from "../types/site";

const DRAWER_WIDTH = 220;

const NAV_ITEMS = [
  { label: "Genel Bakış", path: "" },
  { label: "Finans / Aidat", path: "finance" },
  { label: "Muhasebe", path: "accounting" },
  { label: "Sayaçlar", path: "meters" },
  { label: "Talepler", path: "requests" },
  { label: "Bakım", path: "maintenance" },
  { label: "Demirbaş", path: "inventory" },
];

export function SiteLayout() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [site, setSite] = useState<Site | null>(null);

  useEffect(() => {
    if (!siteId) return;
    getSite(siteId).then(setSite).catch(() => setSite(null));
  }, [siteId]);

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">{site?.name ?? "Site"}</Typography>
          <Button color="inherit" onClick={() => navigate("/sites")}>
            Siteler
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <List>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={`/sites/${siteId}${item.path ? `/${item.path}` : ""}`}
              end={item.path === ""}
              sx={{
                "&.active": {
                  bgcolor: "action.selected",
                  borderRight: "3px solid",
                  borderColor: "primary.main",
                },
              }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
