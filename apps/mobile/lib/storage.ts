import * as SecureStore from "expo-secure-store";

const KEYS = {
  accessToken: "csr_access_token",
  refreshToken: "csr_refresh_token",
  cartSession: "csr_cart_session",
  user: "csr_user",
} as const;

export type StoredUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
};

export async function getAccessToken() {
  return SecureStore.getItemAsync(KEYS.accessToken);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(KEYS.refreshToken);
}

export async function getCartSessionId() {
  return SecureStore.getItemAsync(KEYS.cartSession);
}

export async function setCartSessionId(id: string) {
  await SecureStore.setItemAsync(KEYS.cartSession, id);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await SecureStore.getItemAsync(KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function saveAuthSession(payload: {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}) {
  await SecureStore.setItemAsync(KEYS.accessToken, payload.accessToken);
  await SecureStore.setItemAsync(KEYS.refreshToken, payload.refreshToken);
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(payload.user));
}

export async function clearAuthSession() {
  await SecureStore.deleteItemAsync(KEYS.accessToken);
  await SecureStore.deleteItemAsync(KEYS.refreshToken);
  await SecureStore.deleteItemAsync(KEYS.user);
}
