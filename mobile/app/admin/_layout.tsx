import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { AppDrawerContent } from "../../src/components/ui/AppDrawerContent";
import { colors } from "../../src/theme";

export default function AdminLayout() {
  return (
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
      <Drawer.Screen
        name="dashboard"
        options={{
          drawerLabel: "Anasayfa",
          title: "Anasayfa",
          drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="sites"
        options={{
          drawerLabel: "Siteler",
          title: "Siteler",
          drawerIcon: ({ color, size }) => <Ionicons name="business-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="persons"
        options={{
          drawerLabel: "Kişiler",
          title: "Kişiler",
          drawerIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="users"
        options={{
          drawerLabel: "Kullanıcılar",
          title: "Kullanıcılar",
          drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Drawer>
  );
}
