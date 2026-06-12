/**
 * Apply SQL migrations via Neon HTTP (works when drizzle-kit push fails over TCP).
 *
 * Tracks applied files in `_neon_sql_migrations` so re-runs skip completed migrations.
 * If the ledger is empty but `public.users` already exists, `0000_init.sql` is marked
 * applied without executing (avoids "type already exists" on existing databases).
 */
import "./load-env-files";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = neon(url);
const migrationsDir = join(process.cwd(), "lib/db/migrations");

/**
 * Neon HTTP driver runs one statement per call. Drizzle uses `--> statement-breakpoint`;
 * hand-written files may use a single `;` between statements instead.
 */
function splitMigrationSql(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (trimmed.includes("--> statement-breakpoint")) {
    return trimmed
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Strip full-line SQL comments, then split on semicolon + newline (typical for small ALTER migrations).
  const withoutLineComments = trimmed
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join("\n")
    .trim();

  const parts = withoutLineComments
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim().replace(/;+\s*$/, ""))
    .filter(Boolean);

  return parts.length > 0 ? parts : [withoutLineComments];
}

async function ensureLedgerTable() {
  await sql`
CREATE TABLE IF NOT EXISTS _neon_sql_migrations (
  name text PRIMARY KEY NOT NULL,
  applied_at timestamptz DEFAULT now() NOT NULL
)`;
}

async function ledgerCount(): Promise<number> {
  const rows = await sql`
    SELECT count(*)::int AS cnt FROM _neon_sql_migrations
  `;
  const r = rows as unknown as { cnt: number }[];
  return r[0]?.cnt ?? 0;
}

async function isFileApplied(filename: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 AS ok FROM _neon_sql_migrations WHERE name = ${filename} LIMIT 1
  `;
  return Array.isArray(rows) && rows.length > 0;
}

async function markApplied(filename: string) {
  await sql`INSERT INTO _neon_sql_migrations (name) VALUES (${filename})`;
}

/** Existing DB from an earlier init: avoid re-running full 0000. */
async function bootstrapLedgerForExistingSchema(files: string[]) {
  if (files.length === 0) return;
  const cnt = await ledgerCount();
  if (cnt > 0) return;

  const probe = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS ok
  `;
  const row = probe as unknown as { ok: boolean }[];
  if (row[0]?.ok === true && files.includes("0000_init.sql")) {
    await sql`INSERT INTO _neon_sql_migrations (name) VALUES ('0000_init.sql')`;
    console.log(
      "Detected existing schema (public.users). Marked 0000_init.sql as applied — skipping full init.",
    );
  }
}

async function main() {
  if (!existsSync(migrationsDir)) {
    console.error("No migrations folder. Run: npx drizzle-kit generate");
    process.exit(1);
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("No .sql migration files found");
    process.exit(1);
  }

  await ensureLedgerTable();
  await bootstrapLedgerForExistingSchema(files);

  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    if (await isFileApplied(file)) {
      console.log(`  ${file} — already applied, skip`);
      skipped += 1;
      continue;
    }

    const content = readFileSync(join(migrationsDir, file), "utf8");
    const statements = splitMigrationSql(content);

    console.log(`  ${file} (${statements.length} statements) — applying…`);
    for (const statement of statements) {
      await sql(statement);
    }
    await markApplied(file);
    applied += 1;
  }

  console.log(`✅ Done. Applied ${applied} new migration file(s), skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
