/**
 * Apply Drizzle migrations via Neon HTTP (works when drizzle-kit push fails over TCP).
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq);
      const v = t.slice(eq + 1);
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

loadEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = neon(url);
const migrationsDir = join(process.cwd(), "lib/db/migrations");

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

  console.log(`Applying ${files.length} migration file(s) via Neon HTTP...`);

  for (const file of files) {
    const content = readFileSync(join(migrationsDir, file), "utf8");
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`  ${file} (${statements.length} statements)`);
    for (const statement of statements) {
      await sql(statement);
    }
  }

  console.log("✅ Migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
