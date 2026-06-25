import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import {
  getPushToken,
  initNotificationHandler,
  IS_EXPO_GO,
  notificationDataToRoute,
  registerPushToken,
  subscribeToNotificationEvents,
  type NotificationData,
} from "@/lib/notifications";

// Initialise the foreground notification handler once at module load —
// this is safe because initNotificationHandler() is a no-op in Expo Go
// and does NOT import expo-notifications at the top level.
initNotificationHandler();

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );
  const hydrate = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);
  const setPushToken = useAuthStore((s) => s.setPushToken);
  const router = useRouter();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Request push permission and get token once on app start
  useEffect(() => {
    void (async () => {
      const token = await getPushToken();
      if (!token) return;
      setPushToken(token);
      if (user) await registerPushToken(token);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-register token whenever the logged-in user changes
  useEffect(() => {
    if (!user) return;
    const token = useAuthStore.getState().pushToken;
    if (!token) return;
    void registerPushToken(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Subscribe to notification tap + foreground events (skipped in Expo Go)
  useEffect(() => {
    if (IS_EXPO_GO) return;

    const unsubscribe = subscribeToNotificationEvents(
      (data: NotificationData) => {
        const route = notificationDataToRoute(data);
        if (route) setTimeout(() => router.push(route as "/"), 300);
      },
      (title) => {
        if (title) console.log("[push] Received in foreground:", title);
      },
    );

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
