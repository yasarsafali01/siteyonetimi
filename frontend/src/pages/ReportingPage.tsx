import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Box, Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { getCollectionRate, getDashboard, getDebtors } from "../api/reporting";
import type { CollectionRatePeriod, Dashboard, Debtor } from "../types/reporting";

function formatCurrency(n: number) {
  return n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="outlined" sx={{ minWidth: 180, flex: "1 1 180px" }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6">{value}</Typography>
      </CardContent>
    </Card>
  );
}

export function ReportingPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [collectionRate, setCollectionRate] = useState<CollectionRatePeriod[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId) return;
    Promise.all([getDashboard(siteId), getCollectionRate(siteId, 6), getDebtors(siteId)])
      .then(([d, cr, db]) => {
        setDashboard(d);
        setCollectionRate(cr);
        setDebtors(db);
        setError(null);
      })
      .catch(() => setError("Rapor verileri yüklenemedi"));
  }, [siteId]);

  const maxCharged = Math.max(1, ...collectionRate.map((p) => p.charged));

  return (
    <Box sx={{ p: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h6" sx={{ mb: 2 }}>Dashboard</Typography>
      {dashboard && (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4 }}>
          <KpiCard label="Bağımsız Bölüm" value={String(dashboard.totalUnits)} />
          <KpiCard label="Açık Borç" value={formatCurrency(dashboard.totalOutstandingDebt)} />
          <KpiCard label="Bu Ay Tahakkuk" value={formatCurrency(dashboard.chargedThisMonth)} />
          <KpiCard label="Bu Ay Tahsilat" value={formatCurrency(dashboard.collectedThisMonth)} />
          <KpiCard label="Açık Talep" value={String(dashboard.openRequests)} />
          <KpiCard label="Aktif İş Emri" value={String(dashboard.activeWorkOrders)} />
          <KpiCard label="Bekleyen Rezervasyon" value={String(dashboard.pendingReservations)} />
        </Box>
      )}

      <Typography variant="h6" sx={{ mb: 2 }}>Tahsilat Oranı (Son 6 Ay)</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 4 }}>
        {collectionRate.map((p) => (
          <Box key={p.period}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2">{p.period}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(p.collected)} / {formatCurrency(p.charged)} (%{p.ratePct.toFixed(0)})
              </Typography>
            </Box>
            <Box sx={{ position: "relative", height: 10, bgcolor: "action.hover", borderRadius: 1 }}>
              <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(p.charged / maxCharged) * 100}%`, bgcolor: "warning.light", borderRadius: 1 }} />
              <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(p.collected / maxCharged) * 100}%`, bgcolor: "success.main", borderRadius: 1 }} />
            </Box>
          </Box>
        ))}
      </Box>

      <Typography variant="h6" sx={{ mb: 1 }}>Borçlu Listesi</Typography>
      {debtors.length === 0 ? (
        <Typography color="text.secondary">Borçlu bağımsız bölüm yok.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Blok</TableCell>
              <TableCell>Daire</TableCell>
              <TableCell>Tahakkuk</TableCell>
              <TableCell>Tahsilat</TableCell>
              <TableCell>Kalan Bakiye</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {debtors.map((d) => (
              <TableRow key={d.unitId}>
                <TableCell>{d.blockName}</TableCell>
                <TableCell>{d.unitNumber}</TableCell>
                <TableCell>{formatCurrency(d.totalCharged)}</TableCell>
                <TableCell>{formatCurrency(d.totalPaid)}</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>{formatCurrency(d.remainingAmount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
