/**
 * Cart state is a global store backed by react-query.
 * Guest users get a cart session via X-Cart-Session header (server-issued UUID).
 * Logged-in users' carts are tied to their account.
 */
import { create } from "zustand";
import {
  clearAuthSession,
  getStoredUser,
  saveAuthSession,
  type StoredUser,
} from "@/lib/storage";
import { shopApi } from "@/lib/api/shop";

type AuthState = {
  user: StoredUser | null;
  ready: boolean;
  pushToken: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  setPushToken: (token: string) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  ready: false,
  pushToken: null,

  hydrate: async () => {
    const user = await getStoredUser();
    set({ user, ready: true });
  },

  setPushToken: (token: string) => {
    set({ pushToken: token });
  },

  login: async (email, password) => {
    const tokens = await shopApi.login(email, password);
    await saveAuthSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: tokens.user,
    });
    set({ user: tokens.user });

    // Register push token with backend now that we have an auth session
    const currentToken = get().pushToken;
    if (currentToken) {
      const { registerPushToken } = await import("@/lib/notifications");
      await registerPushToken(currentToken);
    }
  },

  register: async (email, password, name) => {
    const tokens = await shopApi.register(email, password, name);
    await saveAuthSession({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: tokens.user,
    });
    set({ user: tokens.user });

    const currentToken = get().pushToken;
    if (currentToken) {
      const { registerPushToken } = await import("@/lib/notifications");
      await registerPushToken(currentToken);
    }
  },

  logout: async () => {
    // Deregister push token before clearing session
    const currentToken = get().pushToken;
    if (currentToken) {
      const { deregisterPushToken } = await import("@/lib/notifications");
      await deregisterPushToken(currentToken).catch(() => {});
    }
    await clearAuthSession();
    set({ user: null });
  },
}));
