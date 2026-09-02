import type { ReactNode } from "react";
import type { ColorValue } from "react-native";
import { Drawer } from "expo-router/drawer";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { AppDrawerContent } from "../../../src/components/ui/AppDrawerContent";
import { colors } from "../../../src/theme";

type IconFn = (props: { color: ColorValue; size: number; focused: boolean }) => ReactNode;
const icon = (name: keyof typeof Ionicons.glyphMap): IconFn => ({ color, size }) => <Ionicons name={name} size={size} color={color as string} />;
const mcIcon = (name: keyof typeof MaterialCommunityIcons.glyphMap): IconFn => ({ color, size }) => (
  <MaterialCommunityIcons name={name} size={size} color={color as string} />
);

export default function SiteLayout() {
  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} backTo={{ label: "Siteler", href: "/admin/sites" }} />}
      screenOptions={{
        headerTintColor: colors.textPrimary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: "700" },
        drawerActiveBackgroundColor: colors.primary,
        drawerActiveTintColor: "#fff",
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: { fontWeight: "600", marginLeft: -12 },
        drawerType: "front",
      }}
    >
      <Drawer.Screen name="index" options={{ drawerLabel: "Genel Bakış", title: "Genel Bakış", drawerIcon: icon("grid-outline") }} />
      <Drawer.Screen name="finance" options={{ drawerLabel: "Finans / Aidat", title: "Finans / Aidat", drawerIcon: icon("cash-outline") }} />
      <Drawer.Screen name="accounting" options={{ drawerLabel: "Muhasebe", title: "Muhasebe", drawerIcon: icon("calculator-outline") }} />
      <Drawer.Screen name="meters" options={{ drawerLabel: "Sayaçlar", title: "Sayaçlar", drawerIcon: icon("speedometer-outline") }} />
      <Drawer.Screen name="requests" options={{ drawerLabel: "Talepler", title: "Talepler", drawerIcon: icon("build-outline") }} />
      <Drawer.Screen name="maintenance" options={{ drawerLabel: "Bakım", title: "Bakım", drawerIcon: mcIcon("wrench-outline") }} />
      <Drawer.Screen name="inventory" options={{ drawerLabel: "Demirbaş", title: "Demirbaş", drawerIcon: icon("cube-outline") }} />
      <Drawer.Screen name="procurement" options={{ drawerLabel: "Satın Alma", title: "Satın Alma", drawerIcon: icon("cart-outline") }} />
      <Drawer.Screen name="employees" options={{ drawerLabel: "Personel", title: "Personel", drawerIcon: icon("id-card-outline") }} />
      <Drawer.Screen name="security" options={{ drawerLabel: "Güvenlik", title: "Güvenlik", drawerIcon: icon("shield-checkmark-outline") }} />
      <Drawer.Screen name="visitors" options={{ drawerLabel: "Ziyaretçi", title: "Ziyaretçi", drawerIcon: icon("person-add-outline") }} />
      <Drawer.Screen name="access-control" options={{ drawerLabel: "Geçiş Kontrol", title: "Geçiş Kontrol", drawerIcon: icon("enter-outline") }} />
      <Drawer.Screen name="parking" options={{ drawerLabel: "Otopark", title: "Otopark", drawerIcon: icon("car-outline") }} />
      <Drawer.Screen name="cargo" options={{ drawerLabel: "Kargo", title: "Kargo", drawerIcon: icon("cube-outline") }} />
      <Drawer.Screen
        name="facility-reservations"
        options={{ drawerLabel: "Tesis Rezervasyon", title: "Tesis Rezervasyon", drawerIcon: icon("calendar-outline") }}
      />
      <Drawer.Screen name="announcements" options={{ drawerLabel: "Duyurular", title: "Duyurular", drawerIcon: icon("megaphone-outline") }} />
      <Drawer.Screen name="surveys" options={{ drawerLabel: "Anket", title: "Anket", drawerIcon: icon("stats-chart-outline") }} />
      <Drawer.Screen name="documents" options={{ drawerLabel: "Dokümanlar", title: "Dokümanlar", drawerIcon: icon("document-text-outline") }} />
      <Drawer.Screen name="legal" options={{ drawerLabel: "Hukuk", title: "Hukuk", drawerIcon: icon("hammer-outline") }} />
      <Drawer.Screen name="reports" options={{ drawerLabel: "Raporlama", title: "Raporlama", drawerIcon: icon("bar-chart-outline") }} />
    </Drawer>
  );
}
