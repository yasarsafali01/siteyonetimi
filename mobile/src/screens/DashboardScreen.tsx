import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";

export function DashboardScreen() {
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Site Yönetim Platformu</Text>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Çıkış Yap</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        <Text style={styles.welcome}>Panele hoş geldiniz</Text>
        <Text style={styles.subtitle}>Modüller burada listelenecek.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#1976d2",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  logout: {
    color: "#fff",
    fontSize: 14,
  },
  content: {
    padding: 24,
  },
  welcome: {
    fontSize: 20,
    fontWeight: "600",
  },
  subtitle: {
    color: "#666",
    marginTop: 4,
  },
});
