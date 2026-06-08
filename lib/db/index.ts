import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

/**
 * Primary Drizzle client: Neon **serverless Pool** over WebSockets.
 *
 * Why not `neon-http`?
 * - HTTP `neon()` is ideal for single-statement, edge-friendly reads.
 * - Checkout and loyalty paths need **real SQL transactions** (ACID): order + line items +
 *   coupon usage + cart clear + karma must commit or roll back together — same expectation
 *   as Stripe/Shopify-style commerce backends on Postgres.
 *
 * Pool uses the Postgres wire protocol over WebSockets (`ws` on Node). Use Neon's pooled
 * connection string in production (`DATABASE_URL` from the Neon dashboard / Vercel).
 *
 * Lazy init so `next build` can analyze routes without `DATABASE_URL`.
 *
 * @see https://neon.tech/docs/serverless/serverless-driver
 */
export type Database = NeonDatabase<typeof schema>;

let dbInstance: (Database & { $client: Pool }) | undefined;

function createDb(): Database & { $client: Pool } {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!neonConfig.webSocketConstructor) {
    neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
  }

  const max = Math.min(
    20,
    Math.max(1, Number.parseInt(process.env.DATABASE_POOL_MAX ?? "10", 10) || 10),
  );

  const pool = new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
  });

  return drizzle({ client: pool, schema }) as Database & { $client: Pool };
}

export function getDb(): Database & { $client: Pool } {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

export const db = new Proxy({} as Database & { $client: Pool }, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(real);
    }
    return value;
  },
});
