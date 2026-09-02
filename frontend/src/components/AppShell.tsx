import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import ApartmentIcon from "@mui/icons-material/Apartment";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAuth } from "../auth/AuthContext";
import { getMe } from "../api/me";

export const DRAWER_WIDTH = 264;

export interface ShellNavItem {
  label: string;
  path: string;
  icon: ReactNode;
  end?: boolean;
}

interface AppShellProps {
  title: string;
  subtitle?: string;
  navItems: ShellNavItem[];
  headerActions?: ReactNode;
  onBack?: { label: string; onClick: () => void };
  children: ReactNode;
}

export function AppShell({ title, subtitle, navItems, headerActions, onBack, children }: AppShellProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((me) => {
        setUserName(me.fullName);
        setUserRole(me.isSuperAdmin ? "Süper Admin" : me.userType === "sakin" ? "Sakin" : "Yönetici");
      })
      .catch(() => {});
  }, []);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ gap: 1.5, px: 2.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2.5,
            background: "linear-gradient(135deg, #4338ca 0%, #6366f1 60%, #22d3ee 130%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 10px rgba(67, 56, 202, 0.35)",
          }}
        >
          <ApartmentIcon fontSize="small" />
        </Box>
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, letterSpacing: "-0.01em" }}>
          Site Yönetim
        </Typography>
      </Toolbar>

      {onBack && (
        <Box sx={{ px: 1.5, pb: 1 }}>
          <ListItemButton onClick={onBack.onClick} sx={{ color: "text.secondary" }}>
            <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
              <ArrowBackIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={onBack.label} slotProps={{ primary: { variant: "body2" } }} />
          </ListItemButton>
          <Divider sx={{ mt: 1 }} />
        </Box>
      )}

      <List sx={{ flexGrow: 1, overflowY: "auto", py: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            sx={{
              mb: 0.25,
              "&.active": {
                background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)",
                color: "primary.contrastText",
                boxShadow: "0 4px 10px rgba(67, 56, 202, 0.3)",
                "& .MuiListItemIcon-root": { color: "inherit" },
                "&:hover": { background: "linear-gradient(135deg, #3730a3 0%, #4338ca 100%)" },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: "text.secondary" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} slotProps={{ primary: { variant: "body2", sx: { fontWeight: 500 } } }} />
          </ListItemButton>
        ))}
      </List>

      <Divider />
      <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            fontSize: 14,
            fontWeight: 700,
            background: "linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)",
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {userName ?? "..."}
          </Typography>
          {userRole && <Chip label={userRole} size="small" sx={{ height: 18, fontSize: 11, mt: 0.25 }} />}
        </Box>
        <Tooltip title="Çıkış Yap">
          <IconButton size="small" onClick={handleLogout}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isDesktop ? DRAWER_WIDTH : 0,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <AppBar position="sticky" color="inherit" sx={{ bgcolor: "background.paper" }}>
          <Toolbar sx={{ gap: 1.5 }}>
            {!isDesktop && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" noWrap sx={{ lineHeight: 1.2 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            {headerActions}
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1 }}>{children}</Box>
      </Box>
    </Box>
  );
}
