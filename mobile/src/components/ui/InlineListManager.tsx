import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme";
import { FormField } from "./FormField";
import { AppButton } from "./AppButton";
import { EmptyState } from "./ListRow";

export interface InlineField {
  name: string;
  label: string;
  required?: boolean;
}

interface InlineListManagerProps<T> {
  title: string;
  items: T[];
  fields: InlineField[];
  getPrimary: (item: T) => string;
  getSecondary?: (item: T) => string | undefined;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  onDelete?: (item: T) => Promise<void>;
  getKey: (item: T) => string;
}

export function InlineListManager<T>({ title, items, fields, getPrimary, getSecondary, onSubmit, onDelete, getKey }: InlineListManagerProps<T>) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit(values);
      setValues({});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {items.length === 0 ? (
        <EmptyState text="Henüz kayıt yok." />
      ) : (
        items.map((item) => (
          <View key={getKey(item)} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.primary}>{getPrimary(item)}</Text>
              {getSecondary?.(item) && <Text style={styles.secondary}>{getSecondary(item)}</Text>}
            </View>
            {onDelete && (
              <Pressable onPress={() => onDelete(item)} hitSlop={10}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            )}
          </View>
        ))
      )}
      <View style={styles.form}>
        {fields.map((f) => (
          <FormField
            key={f.name}
            label={f.label}
            value={values[f.name] ?? ""}
            onChangeText={(t) => setValues((v) => ({ ...v, [f.name]: t }))}
          />
        ))}
        <AppButton label="Ekle" variant="outlined" small onPress={handleSubmit} loading={submitting} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  primary: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  secondary: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  form: {
    marginTop: 10,
  },
});
