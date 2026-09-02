import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Alert, Box, CircularProgress, MenuItem, TextField } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import { AppShell, type ShellNavItem } from "../../components/AppShell";
import { getMe } from "../../api/me";
import type { Me, Residency } from "../../types/me";
import { ResidentContext } from "./ResidentContext";

const NAV_ITEMS: ShellNavItem[] = [
  { label: "Genel Bakış", path: "/resident", icon: <HomeIcon fontSize="small" />, end: true },
  { label: "Borçlarım", path: "/resident/debts", icon: <ReceiptLongIcon fontSize="small" /> },
  { label: "Taleplerim", path: "/resident/requests", icon: <BuildCircleIcon fontSize="small" /> },
  { label: "Rezervasyonlarım", path: "/resident/reservations", icon: <EventAvailableIcon fontSize="small" /> },
  { label: "Ziyaretçi Davetiyelerim", path: "/resident/invitations", icon: <PersonAddAltIcon fontSize="small" /> },
];

export function ResidentLayout() {
  const [me, setMe] = useState<Me | null>(null);
  const [activeResidency, setActiveResidency] = useState<Residency | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((data) => {
        setMe(data);
        if (data.residencies && data.residencies.length > 0) {
          setActiveResidency(data.residencies[0]);
        }
      })
      .catch(() => setError("Kullanıcı bilgileri yüklenemedi"));
  }, []);

  const subtitle = activeResidency
    ? `${activeResidency.siteName} — ${activeResidency.blockName} / ${activeResidency.unitNumber}`
    : undefined;

  const headerActions =
    me && me.residencies && me.residencies.length > 1 ? (
      <TextField
        select
        size="small"
        value={activeResidency?.unitId ?? ""}
        onChange={(e) => setActiveResidency(me.residencies!.find((r) => r.unitId === e.target.value) ?? null)}
        sx={{ minWidth: 240 }}
      >
        {me.residencies.map((r) => (
          <MenuItem key={r.unitId} value={r.unitId}>
            {r.siteName} — {r.blockName} / {r.unitNumber}
          </MenuItem>
        ))}
      </TextField>
    ) : undefined;

  return (
    <AppShell title="Sakin Paneli" subtitle={subtitle} navItems={NAV_ITEMS} headerActions={headerActions}>
      {error && (
        <Box sx={{ p: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {!error && me && (!me.residencies || me.residencies.length === 0) && (
        <Box sx={{ p: 4 }}>
          <Alert severity="info">
            Hesabınıza bağlı bir bağımsız bölüm bulunamadı. Lütfen site yönetimiyle iletişime geçin.
          </Alert>
        </Box>
      )}

      {!error && me && activeResidency && (
        <ResidentContext.Provider value={{ me, activeResidency }}>
          <Outlet />
        </ResidentContext.Provider>
      )}

      {!error && !me && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}
    </AppShell>
  );
}
