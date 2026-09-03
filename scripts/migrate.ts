import { config } from "dotenv";
config({ path: ".env.local" });

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

const MIGRATIONS_FOLDER = "./drizzle";

async function reconcileLegacyMigrationHistory(
  sql: NeonQueryFunction<false, false>
) {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  const journal = await sql`
    SELECT id FROM drizzle.__drizzle_migrations LIMIT 1
  `;
  if (journal.length > 0) return;

  // The pilot's original Neon schema was applied manually before Drizzle's
  // journal was introduced. Only mark that known baseline as applied after
  // verifying both its core objects and append-only audit trigger exist.
  const [baseline] = await sql`
    SELECT
      to_regclass('public.classrooms') IS NOT NULL AS has_classrooms,
      to_regclass('public.staff') IS NOT NULL AS has_staff,
      to_regclass('public.students') IS NOT NULL AS has_students,
      to_regclass('public.goals') IS NOT NULL AS has_goals,
      to_regclass('public.sessions') IS NOT NULL AS has_sessions,
      to_regclass('public.data_points') IS NOT NULL AS has_data_points,
      to_regclass('public.accommodation_logs') IS NOT NULL AS has_accommodation_logs,
      to_regclass('public.audit_log') IS NOT NULL AS has_audit_log,
      EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'audit_log_no_delete' AND NOT tgisinternal
      ) AS has_audit_trigger
  `;

  const baselineChecks = Object.values(baseline);
  const baselineIsAbsent = baselineChecks.every((value) => !value);
  if (baselineIsAbsent) {
    // This is a genuinely fresh database. Leave the journal empty so Drizzle
    // applies the complete migration sequence starting at 0000.
    return;
  }

  const baselineIsPresent = baselineChecks.every(Boolean);
  if (!baselineIsPresent) {
    throw new Error(
      "Migration journal is empty and the verified legacy baseline is incomplete; refusing to guess migration state."
    );
  }

  const migrations = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  const legacyBaseline = migrations.slice(0, 2);
  if (legacyBaseline.length !== 2) {
    throw new Error("Expected two legacy baseline migrations before incremental migrations.");
  }

  for (const migration of legacyBaseline) {
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${migration.hash}, ${migration.folderMillis})
    `;
  }
  console.log("Recorded verified legacy baseline in the Drizzle migration journal.");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — see .env.local.example");
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log("Running migrations against", new URL(process.env.DATABASE_URL).host);
  await reconcileLegacyMigrationHistory(sql);
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("Migrations complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
