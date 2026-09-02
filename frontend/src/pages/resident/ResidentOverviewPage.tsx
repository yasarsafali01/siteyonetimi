import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Card, CardActionArea, CardContent, Chip, Typography } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import { getPersonBalance } from "../../api/finance";
import { listRequests } from "../../api/request";
import { listFacilityReservations } from "../../api/reservation";
import { listInvitations } from "../../api/visitor";
import type { UnitBalance } from "../../types/finance";
import { useResident } from "./ResidentContext";

function StatCard({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "primary" | "warning" | "success" | "info";
  onClick: () => void;
}) {
  return (
    <Card variant="outlined" sx={{ flex: "1 1 220px", minWidth: 220 }}>
      <CardActionArea onClick={onClick} sx={{ height: "100%" }}>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: `${tone}.light`,
              color: `${tone}.contrastText`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
            <Typography variant="h6" noWrap>{value}</Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function ResidentOverviewPage() {
  const { me, activeResidency } = useResident();
  const navigate = useNavigate();

  const [balance, setBalance] = useState<UnitBalance | null>(null);
  const [openRequests, setOpenRequests] = useState(0);
  const [upcomingReservations, setUpcomingReservations] = useState(0);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPersonBalance(me.personId!),
      listRequests(activeResidency.siteId),
      listFacilityReservations(activeResidency.siteId),
      listInvitations(activeResidency.siteId),
    ])
      .then(([bal, reqs, res, invs]) => {
        setBalance(bal);
        setOpenRequests(reqs.filter((r) => r.status !== "cozuldu" && r.status !== "kapatildi").length);
        setUpcomingReservations(
          res.filter((r) => r.unitId === activeResidency.unitId && r.status === "onaylandi" && new Date(r.startTime) > new Date()).length,
        );
        setPendingInvitations(invs.filter((i) => i.status === "bekliyor" || i.status === "onaylandi").length);
        setError(null);
      })
      .catch(() => setError("Veriler yüklenemedi"));
  }, [me.personId, activeResidency.siteId, activeResidency.unitId]);

  return (
    <Box sx={{ p: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Typography variant="h5">Merhaba, {me.fullName.split(" ")[0]}</Typography>
        <Chip size="small" label={activeResidency.relation === "malik" ? "Malik" : "Kiracı"} color="primary" variant="outlined" />
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <StatCard
          icon={<AccountBalanceWalletIcon fontSize="small" />}
          label="Kalan Bakiye"
          value={`${(balance?.remainingAmount ?? 0).toLocaleString("tr-TR")} ₺`}
          tone={balance && balance.remainingAmount > 0 ? "warning" : "success"}
          onClick={() => navigate("/resident/debts")}
        />
        <StatCard
          icon={<BuildCircleIcon fontSize="small" />}
          label="Açık Talep"
          value={String(openRequests)}
          tone="info"
          onClick={() => navigate("/resident/requests")}
        />
        <StatCard
          icon={<EventAvailableIcon fontSize="small" />}
          label="Yaklaşan Rezervasyon"
          value={String(upcomingReservations)}
          tone="primary"
          onClick={() => navigate("/resident/reservations")}
        />
        <StatCard
          icon={<PersonAddAltIcon fontSize="small" />}
          label="Aktif Ziyaretçi Davetiyesi"
          value={String(pendingInvitations)}
          tone="primary"
          onClick={() => navigate("/resident/invitations")}
        />
      </Box>
    </Box>
  );
}
