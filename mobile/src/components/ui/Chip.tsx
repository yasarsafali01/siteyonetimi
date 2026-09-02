import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";

type Tone = "default" | "primary" | "success" | "warning" | "error" | "info";

const TONE_COLORS: Record<Tone, { bg: string; fg: string }> = {
  default: { bg: "#f1f5f9", fg: colors.textSecondary },
  primary: { bg: "#e0e7ff", fg: colors.primaryDark },
  success: { bg: colors.successLight, fg: "#166534" },
  warning: { bg: colors.warningLight, fg: "#92400e" },
  error: { bg: colors.errorLight, fg: "#991b1b" },
  info: { bg: colors.infoLight, fg: "#075985" },
};

export function Chip({ label, tone = "default" }: { label: string; tone?: Tone }) {
  const c = TONE_COLORS[tone];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.label, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
