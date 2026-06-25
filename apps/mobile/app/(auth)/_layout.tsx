import { Stack } from "expo-router";
import { theme } from "@/constants/theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: theme.colors.primary,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}>
      <Stack.Screen name="login" options={{ title: "Sign in" }} />
      <Stack.Screen name="register" options={{ title: "Create account" }} />
    </Stack>
  );
}
