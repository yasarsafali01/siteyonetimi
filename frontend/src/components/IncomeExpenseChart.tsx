import { useState } from "react";
import { Box, Typography } from "@mui/material";

export interface MonthlyIncomeExpense {
  period: string; // "YYYY-MM"
  income: number;
  expense: number;
}

const INCOME_COLOR = "#2a78d6";
const EXPENSE_COLOR = "#eb6834";
const GRID_COLOR = "#e1e0d9";
const AXIS_COLOR = "#c3c2b7";
const MUTED_TEXT = "#898781";

const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  return `${MONTH_LABELS[Number(month) - 1]} ${year.slice(2)}`;
}

function formatAmount(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("tr-TR");
}

// "Nice" round ticks for the y-axis (0, step, 2*step, ...).
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0];
  const rawStep = max / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const step = (normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1) * magnitude;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step; v += step) ticks.push(v);
  return ticks;
}

interface HoverInfo {
  x: number;
  y: number;
  label: string;
  series: string;
  value: number;
  color: string;
}

export function IncomeExpenseChart({ data }: { data: MonthlyIncomeExpense[] }) {
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const width = 640;
  const height = 260;
  const padLeft = 52;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxValue = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const ticks = niceTicks(maxValue);
  const scaleMax = ticks[ticks.length - 1];

  const groupWidth = data.length > 0 ? plotW / data.length : plotW;
  const barWidth = Math.min(24, groupWidth / 2 - 6);
  const barGap = 2;

  function yFor(v: number) {
    return padTop + plotH - (v / scaleMax) * plotH;
  }

  if (data.length === 0 || maxValue <= 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary" variant="body2">
          Henüz muhasebe fişi girilmedi — gelir/gider grafiği veri birikince görünecek.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Box sx={{ display: "flex", gap: 3, mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: INCOME_COLOR }} />
          <Typography variant="caption" color="text.secondary">Gelir</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: EXPENSE_COLOR }} />
          <Typography variant="caption" color="text.secondary">Gider</Typography>
        </Box>
      </Box>

      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Aylık gelir gider grafiği">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padLeft} x2={width - padRight} y1={yFor(t)} y2={yFor(t)} stroke={GRID_COLOR} strokeWidth={1} />
            <text x={padLeft - 8} y={yFor(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={MUTED_TEXT}>
              {formatAmount(t)}
            </text>
          </g>
        ))}
        <line x1={padLeft} x2={width - padRight} y1={yFor(0)} y2={yFor(0)} stroke={AXIS_COLOR} strokeWidth={1} />

        {data.map((d, i) => {
          const groupX = padLeft + i * groupWidth;
          const centerX = groupX + groupWidth / 2;
          const incomeX = centerX - barWidth - barGap / 2;
          const expenseX = centerX + barGap / 2;
          const incomeY = yFor(d.income);
          const expenseY = yFor(d.expense);

          return (
            <g key={d.period}>
              <rect
                x={incomeX}
                y={incomeY}
                width={barWidth}
                height={Math.max(0, yFor(0) - incomeY)}
                rx={4}
                fill={INCOME_COLOR}
                opacity={hover && hover.label === formatPeriod(d.period) && hover.series !== "Gelir" ? 0.55 : 1}
                style={{ cursor: "pointer", transition: "opacity 0.1s" }}
                onMouseMove={(e) => {
                  const rect = (e.target as SVGRectElement).ownerSVGElement!.getBoundingClientRect();
                  setHover({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    label: formatPeriod(d.period),
                    series: "Gelir",
                    value: d.income,
                    color: INCOME_COLOR,
                  });
                }}
                onMouseLeave={() => setHover(null)}
              />
              <rect
                x={expenseX}
                y={expenseY}
                width={barWidth}
                height={Math.max(0, yFor(0) - expenseY)}
                rx={4}
                fill={EXPENSE_COLOR}
                opacity={hover && hover.label === formatPeriod(d.period) && hover.series !== "Gider" ? 0.55 : 1}
                style={{ cursor: "pointer", transition: "opacity 0.1s" }}
                onMouseMove={(e) => {
                  const rect = (e.target as SVGRectElement).ownerSVGElement!.getBoundingClientRect();
                  setHover({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    label: formatPeriod(d.period),
                    series: "Gider",
                    value: d.expense,
                    color: EXPENSE_COLOR,
                  });
                }}
                onMouseLeave={() => setHover(null)}
              />
              <text x={centerX} y={height - padBottom + 16} textAnchor="middle" fontSize={11} fill={MUTED_TEXT}>
                {formatPeriod(d.period)}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <Box
          sx={{
            position: "absolute",
            left: Math.min(hover.x + 12, width - 140),
            top: Math.max(hover.y - 44, 0),
            bgcolor: "grey.900",
            color: "#fff",
            px: 1.25,
            py: 0.75,
            borderRadius: 1,
            pointerEvents: "none",
            fontSize: 12,
            whiteSpace: "nowrap",
            zIndex: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 8, height: 2, bgcolor: hover.color }} />
            <Typography variant="caption" sx={{ color: "grey.300" }}>{hover.label} · {hover.series}</Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#fff" }}>
            {hover.value.toLocaleString("tr-TR")} ₺
          </Typography>
        </Box>
      )}
    </Box>
  );
}
