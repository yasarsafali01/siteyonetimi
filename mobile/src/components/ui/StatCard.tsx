import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow } from "../../theme";

type Tone = "primary" | "warning" | "success" | "info";

const TONE_GRADIENT: Record<Tone, [string, string]> = {
  primary: ["#4338ca", "#6366f1"],
  warning: ["#b45309", "#f59e0b"],
  success: ["#15803d", "#22c55e"],
  info: ["#0369a1", "#38bdf8"],
};

export function StatCard({
  icon,
  label,
  value,
  tone = "primary",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: Tone;
}) {
  const [from] = TONE_GRADIENT[tone];
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: from }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={styles.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...shadow.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
