import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius } from "../../theme";

interface FormFieldProps extends TextInputProps {
  label: string;
  helperText?: string;
}

export function FormField({ label, helperText, style, ...props }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textSecondary}
        {...props}
      />
      {helperText && <Text style={styles.helper}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  helper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
