import { useEffect, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SpeedIcon from "@mui/icons-material/Speed";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import HandymanIcon from "@mui/icons-material/Handyman";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import BadgeIcon from "@mui/icons-material/Badge";
import SecurityIcon from "@mui/icons-material/Security";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import LocalParkingIcon from "@mui/icons-material/LocalParking";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CampaignIcon from "@mui/icons-material/Campaign";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import DescriptionIcon from "@mui/icons-material/Description";
import GavelIcon from "@mui/icons-material/Gavel";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { AppShell, type ShellNavItem } from "../components/AppShell";
import { getSite } from "../api/sites";
import type { Site } from "../types/site";

export function SiteLayout() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [site, setSite] = useState<Site | null>(null);

  useEffect(() => {
    if (!siteId) return;
    getSite(siteId).then(setSite).catch(() => setSite(null));
  }, [siteId]);

  const base = `/sites/${siteId}`;
  const navItems: ShellNavItem[] = [
    { label: "Genel Bakış", path: base, icon: <DashboardIcon fontSize="small" />, end: true },
    { label: "Finans / Aidat", path: `${base}/finance`, icon: <PaymentsIcon fontSize="small" /> },
    { label: "Muhasebe", path: `${base}/accounting`, icon: <AccountBalanceIcon fontSize="small" /> },
    { label: "Sayaçlar", path: `${base}/meters`, icon: <SpeedIcon fontSize="small" /> },
    { label: "Talepler", path: `${base}/requests`, icon: <BuildCircleIcon fontSize="small" /> },
    { label: "Bakım", path: `${base}/maintenance`, icon: <HandymanIcon fontSize="small" /> },
    { label: "Demirbaş", path: `${base}/inventory`, icon: <Inventory2Icon fontSize="small" /> },
    { label: "Satın Alma", path: `${base}/procurement`, icon: <ShoppingCartIcon fontSize="small" /> },
    { label: "Personel", path: `${base}/employees`, icon: <BadgeIcon fontSize="small" /> },
    { label: "Güvenlik", path: `${base}/security`, icon: <SecurityIcon fontSize="small" /> },
    { label: "Ziyaretçi", path: `${base}/visitors`, icon: <PersonAddAltIcon fontSize="small" /> },
    { label: "Geçiş Kontrol", path: `${base}/access-control`, icon: <MeetingRoomIcon fontSize="small" /> },
    { label: "Otopark", path: `${base}/parking`, icon: <LocalParkingIcon fontSize="small" /> },
    { label: "Kargo", path: `${base}/cargo`, icon: <LocalShippingIcon fontSize="small" /> },
    { label: "Tesis Rezervasyon", path: `${base}/facility-reservations`, icon: <EventAvailableIcon fontSize="small" /> },
    { label: "Duyurular", path: `${base}/announcements`, icon: <CampaignIcon fontSize="small" /> },
    { label: "Anket", path: `${base}/surveys`, icon: <HowToVoteIcon fontSize="small" /> },
    { label: "Dokümanlar", path: `${base}/documents`, icon: <DescriptionIcon fontSize="small" /> },
    { label: "Hukuk", path: `${base}/legal`, icon: <GavelIcon fontSize="small" /> },
    { label: "Raporlama", path: `${base}/reports`, icon: <AssessmentIcon fontSize="small" /> },
  ];

  return (
    <AppShell
      title={site?.name ?? "Site"}
      subtitle={site?.address ?? undefined}
      navItems={navItems}
      onBack={{ label: "Siteler", onClick: () => navigate("/sites") }}
    >
      <Outlet />
    </AppShell>
  );
}
