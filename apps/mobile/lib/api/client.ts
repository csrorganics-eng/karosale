import { getApiOrigin } from "@/constants/config";
import {
  clearAuthSession,
  getAccessToken,
  getCartSessionId,
  getRefreshToken,
  saveAuthSession,
  setCartSessionId,
  type StoredUser,
} from "@/lib/storage";

type EnvelopeOk<T> = { success: true; data: T };
type EnvelopeErr = { success: false; error: string; details?: unknown };

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(text.slice(0, 200) || `HTTP ${res.status}`, res.status);
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    const res = await fetch(`${getApiOrigin()}/api/mobile/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const body = await parseJson<
      EnvelopeOk<{
        accessToken: string;
        refreshToken: string;
        user: StoredUser;
      }> | EnvelopeErr
    >(res);
    if (!res.ok || !body.success) return null;
    await saveAuthSession({
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
      user: body.data.user,
    });
    return body.data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const origin = getApiOrigin();
  const accessToken = await getAccessToken();
  const cartSession = await getCartSessionId();

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (cartSession) headers.set("X-Cart-Session", cartSession);

  const res = await fetch(`${origin}${path}`, { ...init, headers });
  const cartHeader = res.headers.get("X-Cart-Session");
  if (cartHeader) await setCartSessionId(cartHeader);

  if (res.status === 401 && retry && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, init, false);
    await clearAuthSession();
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  const body = await parseJson<EnvelopeOk<T> | EnvelopeErr>(res);
  if (!body.success) {
    throw new ApiError(body.error ?? "Request failed", res.status, body.details);
  }
  return body.data;
}
