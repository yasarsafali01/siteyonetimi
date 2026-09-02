import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { colors } from "../../theme";

export function SegmentedTabs({ tabs, value, onChange }: { tabs: string[]; value: number; onChange: (i: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wrap} contentContainerStyle={{ gap: 8 }}>
      {tabs.map((t, i) => (
        <Pressable key={t} onPress={() => onChange(i)} style={[styles.tab, value === i && styles.tabActive]}>
          <Text style={[styles.label, value === i && styles.labelActive]}>{t}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  labelActive: {
    color: "#fff",
  },
});
