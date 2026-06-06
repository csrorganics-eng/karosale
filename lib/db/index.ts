import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Lazy DB client so `next build` can load route modules without `DATABASE_URL`
 * (Next collects route metadata and evaluates the module graph).
 * The first real query still requires a valid `DATABASE_URL` at runtime.
 *
 * Use `getDb()` when passing the client to libraries that type-check the
 * instance (e.g. Auth.js `DrizzleAdapter`); use `db` everywhere else.
 */
let dbInstance: NeonHttpDatabase<typeof schema> | undefined;

function createDb(): NeonHttpDatabase<typeof schema> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(real);
    }
    return value;
  },
});

export type Database = NeonHttpDatabase<typeof schema>;
