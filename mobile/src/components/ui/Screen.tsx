import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";

interface ScreenProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function Screen({ children, title, action, error, onRefresh, refreshing }: ScreenProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    >
      {(title || action) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {action}
        </View>
      )}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 13,
  },
});
