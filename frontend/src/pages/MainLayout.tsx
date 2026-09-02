import { Outlet } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ApartmentIcon from "@mui/icons-material/Apartment";
import PeopleIcon from "@mui/icons-material/People";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { AppShell, type ShellNavItem } from "../components/AppShell";

const NAV_ITEMS: ShellNavItem[] = [
  { label: "Anasayfa", path: "/dashboard", icon: <DashboardIcon fontSize="small" />, end: true },
  { label: "Siteler", path: "/sites", icon: <ApartmentIcon fontSize="small" /> },
  { label: "Kişiler (CRM)", path: "/persons", icon: <PeopleIcon fontSize="small" /> },
  { label: "Kullanıcılar", path: "/users", icon: <ManageAccountsIcon fontSize="small" /> },
];

export function MainLayout() {
  return (
    <AppShell title="Site Yönetim Platformu" navItems={NAV_ITEMS}>
      <Outlet />
    </AppShell>
  );
}
