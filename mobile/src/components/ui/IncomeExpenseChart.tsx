import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { colors } from "../../theme";
import type { MonthlyIncomeExpense } from "../../types/accounting";

const INCOME_COLOR = "#2a78d6";
const EXPENSE_COLOR = "#eb6834";
const GRID_COLOR = "#e1e0d9";
const MUTED_TEXT = "#898781";

const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  return `${MONTH_LABELS[Number(month) - 1]} ${year.slice(2)}`;
}

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

function formatAmount(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("tr-TR");
}

export function IncomeExpenseChart({ data }: { data: MonthlyIncomeExpense[] }) {
  const [selected, setSelected] = useState<MonthlyIncomeExpense | null>(null);

  const width = 320;
  const height = 200;
  const padLeft = 40;
  const padRight = 8;
  const padTop = 8;
  const padBottom = 22;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxValue = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const ticks = niceTicks(maxValue);
  const scaleMax = ticks[ticks.length - 1];
  const groupWidth = data.length > 0 ? plotW / data.length : plotW;
  const barWidth = Math.min(14, groupWidth / 2 - 3);

  function yFor(v: number) {
    return padTop + plotH - (v / scaleMax) * plotH;
  }

  if (data.length === 0 || maxValue <= 0) {
    return (
      <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: "center", paddingVertical: 20 }}>
        Henüz muhasebe fişi girilmedi.
      </Text>
    );
  }

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: INCOME_COLOR }]} />
          <Text style={styles.legendLabel}>Gelir</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: EXPENSE_COLOR }]} />
          <Text style={styles.legendLabel}>Gider</Text>
        </View>
      </View>

      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {ticks.map((t) => (
          <Line key={t} x1={padLeft} x2={width - padRight} y1={yFor(t)} y2={yFor(t)} stroke={GRID_COLOR} strokeWidth={1} />
        ))}
        {ticks.map((t) => (
          <SvgText key={`l-${t}`} x={padLeft - 6} y={yFor(t) + 3} fontSize={9} fill={MUTED_TEXT} textAnchor="end">
            {formatAmount(t)}
          </SvgText>
        ))}

        {data.map((d, i) => {
          const groupX = padLeft + i * groupWidth;
          const centerX = groupX + groupWidth / 2;
          const incomeX = centerX - barWidth - 1;
          const expenseX = centerX + 1;
          return (
            <G key={d.period}>
              <Rect x={incomeX} y={yFor(d.income)} width={barWidth} height={Math.max(0, yFor(0) - yFor(d.income))} rx={3} fill={INCOME_COLOR} />
              <Rect x={expenseX} y={yFor(d.expense)} width={barWidth} height={Math.max(0, yFor(0) - yFor(d.expense))} rx={3} fill={EXPENSE_COLOR} />
              <SvgText x={centerX} y={height - padBottom + 13} fontSize={9} fill={MUTED_TEXT} textAnchor="middle">
                {formatPeriod(d.period)}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      <View style={styles.tapRow}>
        {data.map((d) => (
          <Pressable key={d.period} style={styles.tapCell} onPress={() => setSelected(d)}>
            <View />
          </Pressable>
        ))}
      </View>

      {selected && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>{formatPeriod(selected.period)}</Text>
          <Text style={styles.tooltipRow}>
            <Text style={{ color: INCOME_COLOR }}>● </Text>Gelir: {selected.income.toLocaleString("tr-TR")} ₺
          </Text>
          <Text style={styles.tooltipRow}>
            <Text style={{ color: EXPENSE_COLOR }}>● </Text>Gider: {selected.expense.toLocaleString("tr-TR")} ₺
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tapRow: {
    flexDirection: "row",
    marginTop: -22,
    height: 22,
  },
  tapCell: {
    flex: 1,
  },
  tooltip: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 10,
  },
  tooltipTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 4,
  },
  tooltipRow: {
    color: "#e2e8f0",
    fontSize: 12,
  },
});
