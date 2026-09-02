import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "../../theme";

type Tone = "primary" | "warning" | "success" | "info";

const TONE_BG: Record<Tone, string> = {
  primary: "#e0e7ff",
  warning: colors.warningLight,
  success: colors.successLight,
  info: colors.infoLight,
};
const TONE_FG: Record<Tone, string> = {
  primary: colors.primaryDark,
  warning: "#92400e",
  success: "#166534",
  info: "#075985",
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
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: TONE_BG[tone] }]}>
        <Ionicons name={icon} size={18} color={TONE_FG[tone]} />
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
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
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
