import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import { createBlock, createCommonArea, listBlocks, listCommonAreas } from "../api/sites";
import { getDashboard } from "../api/reporting";
import { getMonthlyIncomeExpense } from "../api/accounting";
import { IncomeExpenseChart, type MonthlyIncomeExpense } from "../components/IncomeExpenseChart";
import type { Block, CommonArea } from "../types/site";
import type { Dashboard } from "../types/reporting";

function formatCurrency(n: number) {
  return n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
}

function StatCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "primary" | "warning" | "success" | "info" }) {
  return (
    <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 200 }}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
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
    </Card>
  );
}

export function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [areas, setAreas] = useState<CommonArea[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [monthly, setMonthly] = useState<MonthlyIncomeExpense[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [floorCount, setFloorCount] = useState("");

  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [areaSqm, setAreaSqm] = useState("");

  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    if (!siteId) return;
    try {
      const [blockData, areaData, dash, monthlyData] = await Promise.all([
        listBlocks(siteId),
        listCommonAreas(siteId),
        getDashboard(siteId),
        getMonthlyIncomeExpense(siteId, 6),
      ]);
      setBlocks(blockData);
      setAreas(areaData);
      setDashboard(dash);
      setMonthly(monthlyData);
      setError(null);
    } catch {
      setError("Site bilgileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function handleCreateBlock(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createBlock(siteId, {
        name: blockName,
        floorCount: floorCount ? Number(floorCount) : undefined,
      });
      setBlockDialogOpen(false);
      setBlockName("");
      setFloorCount("");
      await refresh();
    } catch {
      setError("Blok oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateArea(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createCommonArea(siteId, {
        name: areaName,
        areaSqm: areaSqm ? Number(areaSqm) : undefined,
      });
      setAreaDialogOpen(false);
      setAreaName("");
      setAreaSqm("");
      await refresh();
    } catch {
      setError("Ortak alan oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {dashboard && (
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
            <StatCard
              icon={<AccountBalanceWalletIcon fontSize="small" />}
              label="Açık Borç"
              value={formatCurrency(dashboard.totalOutstandingDebt)}
              tone="warning"
            />
            <StatCard
              icon={<TrendingUpIcon fontSize="small" />}
              label="Bu Ay Tahsilat"
              value={formatCurrency(dashboard.collectedThisMonth)}
              tone="success"
            />
            <StatCard
              icon={<BuildCircleIcon fontSize="small" />}
              label="Açık Talep"
              value={String(dashboard.openRequests)}
              tone="info"
            />
            <StatCard
              icon={<EventAvailableIcon fontSize="small" />}
              label="Bekleyen Rezervasyon"
              value={String(dashboard.pendingReservations)}
              tone="primary"
            />
          </Box>
        )}

        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Gelir / Gider (Son 6 Ay)</Typography>
          <IncomeExpenseChart data={monthly} />
        </Paper>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Bloklar</Typography>
              <Button variant="contained" size="small" onClick={() => setBlockDialogOpen(true)}>
                Yeni Blok
              </Button>
            </Box>
            {blocks.length === 0 && <Typography color="text.secondary">Henüz blok eklenmedi.</Typography>}
            <List>
              {blocks.map((block) => (
                <ListItemButton key={block.id} onClick={() => navigate(`/sites/${siteId}/blocks/${block.id}`)}>
                  <ListItemText
                    primary={block.name}
                    secondary={block.floorCount ? `${block.floorCount} kat` : undefined}
                  />
                </ListItemButton>
              ))}
            </List>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Ortak Alanlar</Typography>
              <Button variant="contained" size="small" onClick={() => setAreaDialogOpen(true)}>
                Yeni Ortak Alan
              </Button>
            </Box>
            {areas.length === 0 && <Typography color="text.secondary">Henüz ortak alan eklenmedi.</Typography>}
            <List>
              {areas.map((area) => (
                <ListItemButton key={area.id} disableRipple sx={{ cursor: "default" }}>
                  <ListItemText
                    primary={area.name}
                    secondary={area.areaSqm ? `${area.areaSqm} m²` : undefined}
                  />
                </ListItemButton>
              ))}
            </List>
          </Grid>
        </Grid>
      </Box>

      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateBlock}>
          <DialogTitle>Yeni Blok</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Blok Adı" value={blockName} onChange={(e) => setBlockName(e.target.value)} required autoFocus fullWidth />
            <TextField
              label="Kat Sayısı"
              type="number"
              value={floorCount}
              onChange={(e) => setFloorCount(e.target.value)}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBlockDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Kaydet
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={areaDialogOpen} onClose={() => setAreaDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateArea}>
          <DialogTitle>Yeni Ortak Alan</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Alan Adı" value={areaName} onChange={(e) => setAreaName(e.target.value)} required autoFocus fullWidth />
            <TextField
              label="Metrekare"
              type="number"
              value={areaSqm}
              onChange={(e) => setAreaSqm(e.target.value)}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAreaDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Kaydet
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
