/**
 * Drizzle Kit loads this config from the project root. Load env first (with quote stripping),
 * then build Neon-safe credentials for the bundled `pg` client.
 */
import "./scripts/load-env-files";
import { defineConfig } from "drizzle-kit";
import { getDrizzleKitPostgresCredentials } from "./lib/db/drizzle-kit-credentials";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: getDrizzleKitPostgresCredentials(),
  strict: true,
});
