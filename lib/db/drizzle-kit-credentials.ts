import type { ConnectionOptions } from "node:tls";

/**
 * Drizzle Kit uses the `pg` driver for PostgreSQL. With Neon, pooled hosts (`*-pooler.*`)
 * and URL-only `dbCredentials` often produce TLS `ECONNRESET` mid-handshake on Windows.
 *
 * This module:
 * 1. Resolves the same env chain as before (direct URL overrides pooled app URL).
 * 2. Strips `-pooler.` from the hostname when present (Neon direct endpoint).
 * 3. Parses the URL and passes **explicit** `ssl: "require"` for remote hosts so `pg`
 *    negotiates TLS predictably (same idea as `sslmode=require` in the connection string).
 */
function resolveRawUrl(): string {
  const direct =
    process.env.DRIZZLE_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    "";
  const pooled = process.env.DATABASE_URL?.trim() || "";
  const raw = direct || pooled;
  if (!raw) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (optionally DRIZZLE_DATABASE_URL with Neon’s direct / non-pooler string if push still fails).",
    );
  }
  return raw;
}

/** Strip wrapping quotes from dotenv-style values. */
function stripQuotes(v: string): string {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/** Neon pooled endpoints use `-pooler.` before the region; direct endpoints omit it. */
export function stripNeonPoolerHostname(hostname: string): string {
  return hostname.replace(/-pooler\./g, ".");
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}

function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

type PgHostCredentials = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean | "require" | "allow" | "prefer" | "verify-full" | ConnectionOptions;
};

/**
 * Build `dbCredentials` for `defineConfig` (PostgreSQL dialect).
 */
export function getDrizzleKitPostgresCredentials(): PgHostCredentials | { url: string } {
  const raw = stripQuotes(resolveRawUrl());
  const withScheme = /^postgres(ql)?:\/\//i.test(raw) ? raw : `postgresql://${raw}`;

  let u: URL;
  try {
    u = new URL(withScheme.replace(/^postgres(ql)?:\/\//i, "https://"));
  } catch {
    return { url: ensureSslQueryParam(rewritePoolerInUrlString(withScheme)) };
  }

  const host = stripNeonPoolerHostname(u.hostname);
  const port = u.port ? Number.parseInt(u.port, 10) : 5432;
  const database = (u.pathname.replace(/^\//, "") || "postgres").split("?")[0] || "postgres";
  const user = safeDecode(u.username || "postgres");
  const password = safeDecode(u.password || "");

  if (isLocalHost(host)) {
    return { host, port, user, password, database };
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: "require",
  };
}

function rewritePoolerInUrlString(urlStr: string): string {
  return urlStr.replace(/-pooler\./g, ".");
}

function ensureSslQueryParam(urlStr: string): string {
  if (/[?&]sslmode=/i.test(urlStr)) return urlStr;
  return urlStr.includes("?") ? `${urlStr}&sslmode=require` : `${urlStr}?sslmode=require`;
}
