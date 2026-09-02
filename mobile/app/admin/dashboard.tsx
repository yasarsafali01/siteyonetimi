import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { Screen } from "../../src/components/ui/Screen";
import { colors, radius } from "../../src/theme";

const MODULES = [
  { title: "Siteler", description: "Site, blok ve bağımsız bölüm yönetimi", path: "/admin/sites", icon: "business-outline" as const },
  { title: "Kişiler (CRM)", description: "Malik, kiracı ve diğer kişi kayıtları", path: "/admin/persons", icon: "people-outline" as const },
  { title: "Kullanıcılar", description: "Yönetici ve sakin giriş hesapları", path: "/admin/users", icon: "settings-outline" as const },
];

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <Screen title="Panele hoş geldiniz">
      <View style={styles.grid}>
        {MODULES.map((mod) => (
          <Pressable key={mod.path} style={styles.card} onPress={() => router.push(mod.path as never)}>
            <View style={styles.iconWrap}>
              <Ionicons name={mod.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>{mod.title}</Text>
            <Text style={styles.cardDesc}>{mod.description}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
