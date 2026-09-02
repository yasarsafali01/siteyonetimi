import { StyleSheet, Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { colors, radius } from "../../theme";

interface Option {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}

export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={value} onValueChange={(v) => onChange(String(v))}>
          {options.map((opt) => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>
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
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
});
