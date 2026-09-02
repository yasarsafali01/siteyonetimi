import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { DrawerContentScrollView, DrawerItemList, type DrawerContentComponentProps } from "expo-router/drawer";
import { useAuth } from "../../auth/AuthContext";
import { getMe } from "../../api/me";
import { colors } from "../../theme";

interface AppDrawerContentProps extends DrawerContentComponentProps {
  backTo?: { label: string; href: Href };
}

export function AppDrawerContent({ backTo, ...props }: AppDrawerContentProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((me) => {
        setName(me.fullName);
        setRole(me.isSuperAdmin ? "Süper Admin" : me.userType === "sakin" ? "Sakin" : "Yönetici");
      })
      .catch(() => {});
  }, []);

  const initials = name
    ? name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="business" size={18} color="#fff" />
        </View>
        <Text style={styles.brandText}>Site Yönetim</Text>
      </View>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 4 }}>
        {backTo && (
          <Pressable style={styles.backRow} onPress={() => router.push(backTo.href)}>
            <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
            <Text style={styles.backLabel}>{backTo.label}</Text>
          </Pressable>
        )}
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <View style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>{name ?? "..."}</Text>
          {role && <Text style={styles.role}>{role}</Text>}
        </View>
        <Pressable onPress={logout} hitSlop={10}>
          <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontWeight: "700",
    fontSize: 15,
    color: colors.textPrimary,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  role: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
