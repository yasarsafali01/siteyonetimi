import { Stack } from "expo-router";
import { colors } from "../../../../src/theme";

export default function EmployeesStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textPrimary,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Personel" }} />
      <Stack.Screen name="[employeeId]" options={{ title: "Personel Detayı" }} />
    </Stack>
  );
}
