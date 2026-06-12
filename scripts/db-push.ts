/**
 * Schema sync entry point.
 *
 * **Neon (`*.neon.tech`):** `drizzle-kit push` introspects over TCP (`pg`) and often fails on
 * some networks with `ECONNRESET`. When `DATABASE_URL` looks like Neon, this script runs
 * `scripts/migrate-neon.ts` instead (Neon HTTP), same as `npm run db:migrate`.
 *
 * **Other Postgres:** runs `drizzle-kit push` with:
 * - `.env.local` / `.env` loaded (see `load-env-files`).
 * - This repo's `node_modules` prepended to `NODE_PATH` (avoids picking up a parent-folder `pg`).
 * - IPv4-first DNS (helps some Windows / TLS paths).
 *
 * Override: `DRIZZLE_KIT_PUSH=1` forces drizzle-kit even on Neon. `FORCE_NEON_HTTP_DB_PUSH=1`
 * forces HTTP migrations when the host is not neon.tech (e.g. custom proxy).
 */
import { spawnSync } from "node:child_process";
import { delimiter, join } from "node:path";
import "./load-env-files";

const root = process.cwd();
const localNodeModules = join(root, "node_modules");
const drizzleBin = join(localNodeModules, "drizzle-kit", "bin.cjs");
const tsxCli = join(localNodeModules, "tsx", "dist", "cli.mjs");
const migrateNeonScript = join(root, "scripts", "migrate-neon.ts");

const nodePath = [localNodeModules, process.env.NODE_PATH].filter(Boolean).join(delimiter);
const env = { ...process.env, NODE_PATH: nodePath };

function databaseUrlLooksNeon(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.includes("neon.tech");
  } catch {
    return false;
  }
}

const forceDrizzle =
  process.env.DRIZZLE_KIT_PUSH === "1" || process.env.DRIZZLE_KIT_PUSH === "true";
const forceNeonHttp =
  process.env.FORCE_NEON_HTTP_DB_PUSH === "1" ||
  process.env.FORCE_NEON_HTTP_DB_PUSH === "true";

const useNeonHttp =
  !forceDrizzle &&
  (forceNeonHttp || databaseUrlLooksNeon(process.env.DATABASE_URL));

if (useNeonHttp) {
  console.log(
    "Neon (or FORCE_NEON_HTTP_DB_PUSH): applying `lib/db/migrations/*.sql` over HTTP — skipping drizzle-kit TCP push.",
  );
  const neonResult = spawnSync(process.execPath, [tsxCli, migrateNeonScript], {
    stdio: "inherit",
    cwd: root,
    env,
  });
  if (neonResult.error) {
    console.error(neonResult.error);
    process.exit(1);
  }
  process.exit(neonResult.status ?? 1);
}

const result = spawnSync(
  process.execPath,
  ["--dns-result-order=ipv4first", drizzleBin, "push"],
  { stdio: "inherit", cwd: root, env },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
