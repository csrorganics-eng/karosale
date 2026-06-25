/**
 * Push notification setup for the CSR Organics native app.
 *
 * IMPORTANT: expo-notifications must NOT be statically imported at module level.
 * From SDK 53, Expo Go throws at module load due to DevicePushTokenAutoRegistration.fx.js
 * running as a side effect. We use lazy require() so the module is only loaded
 * in real development/production builds, never in Expo Go.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiFetch } from "@/lib/api/client";

/** True when running inside Expo Go — push is unsupported from SDK 53+. */
export const IS_EXPO_GO = Constants.appOwnership === "expo";

/** Lazy loader — returns the expo-notifications module only in real builds. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getN = () => require("expo-notifications") as typeof import("expo-notifications");

export type NotificationData = {
  screen?: "order" | "cart" | "loyalty" | "product" | "home";
  orderId?: string;
  orderNumber?: string;
  productSlug?: string;
  status?: string;
};

/**
 * Initialise the foreground notification handler.
 * Must be called once on app start (from AppProviders), skipped in Expo Go.
 */
export function initNotificationHandler(): void {
  if (IS_EXPO_GO) return;
  getN().setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Sets up Android notification channels. */
async function setupAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android" || IS_EXPO_GO) return;
  const N = getN();
  await N.setNotificationChannelAsync("orders", {
    name: "Order Updates",
    description: "Confirmation, shipping, and delivery notifications",
    importance: N.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#1e4d3a",
    sound: "default",
  });
  await N.setNotificationChannelAsync("reminders", {
    name: "Reminders",
    description: "Cart reminders and promotional alerts",
    importance: N.AndroidImportance.DEFAULT,
    sound: "default",
  });
  await N.setNotificationChannelAsync("promotions", {
    name: "Promotions & Offers",
    description: "Sale alerts and special offers",
    importance: N.AndroidImportance.LOW,
  });
}

/**
 * Requests permission and returns the Expo push token string.
 * Returns null in Expo Go, on simulators, or if permission is denied.
 */
export async function getPushToken(): Promise<string | null> {
  if (IS_EXPO_GO) {
    console.log("[push] Skipping — Expo Go does not support push (SDK 53+)");
    return null;
  }
  if (!Constants.isDevice) {
    console.log("[push] Skipping — not a physical device");
    return null;
  }

  await setupAndroidChannels();

  const N = getN();
  const existingPerms = await N.getPermissionsAsync();

  function isAuthorized(perms: typeof existingPerms): boolean {
    if (Platform.OS === "ios") {
      return (
        perms.ios?.status === N.IosAuthorizationStatus.AUTHORIZED ||
        perms.ios?.status === N.IosAuthorizationStatus.PROVISIONAL
      );
    }
    return false;
  }

  let permGranted = isAuthorized(existingPerms);
  if (!permGranted) {
    const requested = await N.requestPermissionsAsync();
    permGranted = isAuthorized(requested);
    if (Platform.OS === "android") permGranted = true;
  }

  if (!permGranted) {
    console.log("[push] Permission denied");
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenData = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return tokenData.data;
  } catch (err) {
    console.error("[push] getExpoPushTokenAsync failed:", err);
    return null;
  }
}

/** Register a push token with the backend. Safe to call multiple times. */
export async function registerPushToken(token: string): Promise<void> {
  try {
    await apiFetch("/api/push/register", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "unknown",
      }),
    });
    console.log("[push] Token registered:", token.slice(0, 30) + "…");
  } catch (err) {
    console.error("[push] Failed to register token:", err);
  }
}

/** Deregister a push token on logout. */
export async function deregisterPushToken(token: string): Promise<void> {
  try {
    await apiFetch("/api/push/register", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
  } catch {
    // Best-effort
  }
}

/** Map notification data payload to an in-app route string. */
export function notificationDataToRoute(data: NotificationData): string | null {
  switch (data.screen) {
    case "order":
      return data.orderId ? `/orders/${data.orderId}` : "/orders";
    case "cart":
      return "/(tabs)/cart";
    case "loyalty":
      return "/loyalty";
    case "product":
      return data.productSlug ? `/product/${data.productSlug}` : "/(tabs)/shop";
    default:
      return null;
  }
}

/**
 * Subscribe to notification events (tap + foreground receive).
 * Returns a cleanup function. Only call in real builds.
 */
export function subscribeToNotificationEvents(
  onTap: (data: NotificationData) => void,
  onReceive?: (title: string | null | undefined) => void,
): () => void {
  if (IS_EXPO_GO) return () => {};

  const N = getN();

  const tapSub = N.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as NotificationData;
    onTap(data);
  });

  const receiveSub = N.addNotificationReceivedListener((notification) => {
    onReceive?.(notification.request.content.title);
  });

  return () => {
    tapSub.remove();
    receiveSub.remove();
  };
}
