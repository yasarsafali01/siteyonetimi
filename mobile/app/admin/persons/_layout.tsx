import { Stack } from "expo-router";
import { colors } from "../../../src/theme";

export default function PersonsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textPrimary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Kişiler" }} />
      <Stack.Screen name="[personId]" options={{ title: "Kişi Detayı" }} />
    </Stack>
  );
}
