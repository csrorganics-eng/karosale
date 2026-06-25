import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_600SemiBold } from "@expo-google-fonts/playfair-display";
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AppProviders } from "@/providers/AppProviders";
import { theme } from "@/constants/theme";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AppProviders>
      <RootLayoutNav />
    </AppProviders>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : navTheme}>
      <Stack
        screenOptions={{
          headerTintColor: theme.colors.primary,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerShadowVisible: false,
          headerBackTitle: "Back",
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[slug]" options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="checkout" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        <Stack.Screen name="orders/[id]" options={{ title: "Order detail" }} />
        <Stack.Screen name="wishlist" options={{ headerShown: false }} />
        <Stack.Screen name="addresses" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="categories" options={{ headerShown: false }} />
        <Stack.Screen name="loyalty" options={{ headerShown: false }} />
        <Stack.Screen name="subscriptions" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
