import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Redirect, Slot, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import { colors } from "../src/theme";

function Gate() {
  const { isAuthenticated, isLoading, userType } = useAuth();
  const segments = useSegments();
  const group = segments[0] as string | undefined;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    if (group !== undefined && group !== "login") {
      return <Redirect href="/login" />;
    }
    return <Slot />;
  }

  // Giriş yapılmış: sakin sadece resident/, yönetici sadece admin/ veya site/ altında olabilir.
  if (userType === "sakin" && group !== "resident") {
    return <Redirect href="/resident" />;
  }
  if (userType === "yonetici" && group !== "admin" && group !== "site") {
    return <Redirect href="/admin/dashboard" />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <Gate />
          <StatusBar style="dark" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
