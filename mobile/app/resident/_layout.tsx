import { useEffect, useState } from "react";
import type { ColorValue } from "react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { AppDrawerContent } from "../../src/components/ui/AppDrawerContent";
import { colors } from "../../src/theme";
import { getMe } from "../../src/api/me";
import type { Me, Residency } from "../../src/types/me";
import { ResidentContext } from "../../src/auth/ResidentContext";

type IconFn = (props: { color: ColorValue; size: number; focused: boolean }) => ReactNode;
const icon = (name: keyof typeof Ionicons.glyphMap): IconFn => ({ color, size }) => <Ionicons name={name} size={size} color={color as string} />;

export default function ResidentLayout() {
  const [me, setMe] = useState<Me | null>(null);
  const [activeResidency, setActiveResidency] = useState<Residency | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((data) => {
        setMe(data);
        if (data.residencies && data.residencies.length > 0) setActiveResidency(data.residencies[0]);
      })
      .catch(() => setError("Kullanıcı bilgileri yüklenemedi"));
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!me || (me.residencies && me.residencies.length > 0 && !activeResidency)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!me.residencies || me.residencies.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Hesabınıza bağlı bir bağımsız bölüm bulunamadı. Lütfen site yönetimiyle iletişime geçin.</Text>
      </View>
    );
  }

  return (
    <ResidentContext.Provider value={{ me, activeResidency: activeResidency!, setActiveResidency }}>
      <Drawer
        drawerContent={(props) => <AppDrawerContent {...props} />}
        screenOptions={{
          headerTintColor: colors.textPrimary,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontWeight: "700" },
          drawerActiveBackgroundColor: colors.primary,
          drawerActiveTintColor: "#fff",
          drawerInactiveTintColor: colors.textSecondary,
          drawerLabelStyle: { fontWeight: "600", marginLeft: -12 },
        }}
      >
        <Drawer.Screen name="index" options={{ drawerLabel: "Genel Bakış", title: "Genel Bakış", drawerIcon: icon("home-outline") }} />
        <Drawer.Screen name="debts" options={{ drawerLabel: "Borçlarım", title: "Borçlarım", drawerIcon: icon("wallet-outline") }} />
        <Drawer.Screen name="requests" options={{ drawerLabel: "Taleplerim", title: "Taleplerim", drawerIcon: icon("build-outline") }} />
        <Drawer.Screen name="reservations" options={{ drawerLabel: "Rezervasyonlarım", title: "Rezervasyonlarım", drawerIcon: icon("calendar-outline") }} />
        <Drawer.Screen name="invitations" options={{ drawerLabel: "Ziyaretçi Davetiyelerim", title: "Ziyaretçi Davetiyelerim", drawerIcon: icon("person-add-outline") }} />
      </Drawer>
    </ResidentContext.Provider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: 24,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: "center",
  },
});
