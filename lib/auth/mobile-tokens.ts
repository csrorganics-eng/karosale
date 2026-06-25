import { SignJWT, jwtVerify } from "jose";

const ACCESS_TTL_SEC = 60 * 60 * 24 * 7; // 7 days
const REFRESH_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

export type MobileTokenUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  role: string;
};

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!raw) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(raw);
}

export async function createMobileTokens(user: MobileTokenUser) {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await new SignJWT({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    role: user.role,
    typ: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TTL_SEC)
    .sign(secret);

  const refreshToken = await new SignJWT({ typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + REFRESH_TTL_SEC)
    .sign(secret);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TTL_SEC,
    user: {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      role: user.role,
    },
  };
}

export async function verifyMobileAccessToken(token: string): Promise<MobileTokenUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.typ !== "access" || !payload.sub) return null;
    return {
      id: payload.sub,
      email: (payload.email as string | undefined) ?? null,
      name: (payload.name as string | undefined) ?? null,
      role: (payload.role as string) ?? "customer",
    };
  } catch {
    return null;
  }
}

export async function verifyMobileRefreshToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.typ !== "refresh" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
