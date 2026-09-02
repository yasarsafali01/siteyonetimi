import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius } from "../../theme";

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: "contained" | "outlined" | "text";
  color?: "primary" | "error" | "success";
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}

export function AppButton({ label, onPress, variant = "contained", color = "primary", disabled, loading, small }: AppButtonProps) {
  const tone = color === "error" ? colors.error : color === "success" ? colors.success : colors.primary;
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    small && styles.small,
    variant === "contained" && { backgroundColor: tone },
    variant === "outlined" && { borderWidth: 1, borderColor: tone, backgroundColor: "transparent" },
    variant === "text" && { backgroundColor: "transparent", paddingHorizontal: 8 },
    isDisabled && { opacity: 0.5 },
  ];

  const textStyle = [
    styles.label,
    small && styles.smallLabel,
    variant === "contained" ? { color: "#fff" } : { color: tone },
  ];

  return (
    <Pressable onPress={onPress} disabled={isDisabled} style={containerStyle}>
      {loading ? <ActivityIndicator size="small" color={variant === "contained" ? "#fff" : tone} /> : <Text style={textStyle}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  small: {
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  label: {
    fontWeight: "600",
    fontSize: 15,
  },
  smallLabel: {
    fontSize: 13,
  },
});
