import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { getPersonBalance, listChargesForUnit } from "../../api/finance";
import type { ChargeWithBalance, UnitBalance } from "../../types/finance";
import { useResident } from "./ResidentContext";

const CHARGE_TYPE_LABELS: Record<string, string> = {
  aidat: "Aidat",
  ek_aidat: "Ek Aidat",
  ozel_gider: "Özel Gider",
  gecikme_faizi: "Gecikme Faizi",
  gecikme_tazminati: "Gecikme Tazminatı",
};

export function ResidentDebtsPage() {
  const { me, activeResidency } = useResident();

  const [balance, setBalance] = useState<UnitBalance | null>(null);
  const [charges, setCharges] = useState<ChargeWithBalance[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPersonBalance(me.personId!), listChargesForUnit(activeResidency.unitId)])
      .then(([bal, chg]) => {
        setBalance(bal);
        setCharges(chg);
        setError(null);
      })
      .catch(() => setError("Borç bilgileri yüklenemedi"));
  }, [me.personId, activeResidency.unitId]);

  return (
    <Box sx={{ p: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h5" sx={{ mb: 3 }}>Borçlarım</Typography>

      <Card variant="outlined" sx={{ mb: 3, maxWidth: 260 }}>
        <CardContent>
          <Typography variant="caption" color="text.secondary">Kalan Bakiye</Typography>
          <Typography variant="h5" color={balance && balance.remainingAmount > 0 ? "warning.main" : "success.main"}>
            {(balance?.remainingAmount ?? 0).toLocaleString("tr-TR")} ₺
          </Typography>
        </CardContent>
      </Card>

      {charges.length === 0 ? (
        <Typography color="text.secondary">Borç kaydınız yok.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tür</TableCell>
              <TableCell>Dönem</TableCell>
              <TableCell>Tutar</TableCell>
              <TableCell>Ödenen</TableCell>
              <TableCell>Kalan</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {charges.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{CHARGE_TYPE_LABELS[c.type] ?? c.type}</TableCell>
                <TableCell>{c.period ?? "-"}</TableCell>
                <TableCell>{c.amount.toLocaleString("tr-TR")} ₺</TableCell>
                <TableCell>{c.paidAmount.toLocaleString("tr-TR")} ₺</TableCell>
                <TableCell>{c.remainingAmount.toLocaleString("tr-TR")} ₺</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
