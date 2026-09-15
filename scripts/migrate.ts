import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const migrationFolder = resolve(process.cwd(), "drizzle");
const legacyMigration = "20260914165843_init";
const baselinePath = resolve(migrationFolder, "0000_prisma_baseline.sql");
type Column = { type: string; notNull: boolean; default: string | null };
type Index = { unique: boolean; columns: string[]; options: number[]; method: string; predicate: string | null; valid: boolean };
type Constraint = { kind: string; columns: string[]; deferrable: boolean; initiallyDeferred: boolean; validated: boolean; foreignSchema?: string; foreignTable?: string; foreignColumns?: string[]; delete?: string; update?: string };
type Table = { columns: Record<string, Column>; indexes: Record<string, Index>; constraints: Record<string, Constraint> };
type Catalog = { enums: Record<string, string[]>; tables: Record<string, Table> };

const names = (value: string) => [...value.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

/** The immutable baseline is also the schema contract for adopting Prisma data. */
export function expectedBaselineCatalog(source = readFileSync(baselinePath, "utf8")): Catalog {
  const catalog: Catalog = { enums: {}, tables: {} };
  for (const match of source.matchAll(/CREATE TYPE "([^"]+)" AS ENUM \(([^;]+)\);/g)) {
    catalog.enums[match[1]] = [...match[2].matchAll(/'([^']+)'/g)].map((value) => value[1]);
  }
  for (const match of source.matchAll(/CREATE TABLE "([^"]+)" \(([\s\S]*?)\n\);/g)) {
    const table: Table = { columns: {}, indexes: {}, constraints: {} };
    for (const line of match[2].split("\n")) {
      const column = line.match(/^\s+"([^"]+)" ("[^"]+"|TIMESTAMP\(3\)|TEXT|BOOLEAN|INTEGER|JSONB)( NOT NULL)?(?: DEFAULT (.*?))?,?$/);
      if (column) {
        const type = column[2] === "TIMESTAMP(3)" ? "timestamp(3) without time zone" : column[2].startsWith('"') ? column[2].slice(1, -1) : column[2].toLowerCase();
        let defaultValue = column[4] ?? null;
        if (defaultValue?.startsWith("'")) defaultValue += type === "text" ? "::text" : `::"${type}"`;
        table.columns[column[1]] = { type, notNull: Boolean(column[3]), default: defaultValue };
      }
      const pk = line.match(/CONSTRAINT "([^"]+)" PRIMARY KEY \(([^)]+)\)/);
      if (pk) {
        table.constraints[pk[1]] = { kind: "p", columns: names(pk[2]), deferrable: false, initiallyDeferred: false, validated: true };
        table.indexes[pk[1]] = { unique: true, columns: names(pk[2]), options: names(pk[2]).map(() => 0), method: "btree", predicate: null, valid: true };
      }
    }
    catalog.tables[match[1]] = table;
  }
  for (const match of source.matchAll(/CREATE (UNIQUE )?INDEX "([^"]+)" ON "([^"]+)"\(([^)]+)\);/g)) {
    catalog.tables[match[3]].indexes[match[2]] = {
      unique: Boolean(match[1]), columns: names(match[4]), options: names(match[4]).map(() => 0), method: "btree", predicate: null, valid: true,
    };
  }
  for (const match of source.matchAll(/ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" FOREIGN KEY \(([^)]+)\) REFERENCES "([^"]+)"\(([^)]+)\) ON DELETE (CASCADE|SET NULL|RESTRICT) ON UPDATE (CASCADE);/g)) {
    catalog.tables[match[1]].constraints[match[2]] = {
      kind: "f", columns: names(match[3]), deferrable: false, initiallyDeferred: false, validated: true,
      foreignSchema: "public", foreignTable: match[4], foreignColumns: names(match[5]),
      delete: ({ CASCADE: "c", "SET NULL": "n", RESTRICT: "r" })[match[6]], update: "c",
    };
  }
  if (Object.keys(catalog.tables).length !== 16 || Object.keys(catalog.enums).length !== 7
    || Object.values(catalog.tables).some((table) => Object.keys(table.columns).length === 0)) {
    throw new Error("Unrecognized baseline SQL; refusing to infer an adoption contract.");
  }
  return catalog;
}

// Kept as a single expression so adoption rechecks it inside the write transaction.
export const catalogSql = `
SELECT jsonb_build_object(
  'enums', COALESCE((
    SELECT jsonb_object_agg(e.name, e.labels) FROM (
      SELECT t.typname AS name, jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
      FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' GROUP BY t.typname
    ) e
  ), '{}'::jsonb),
  'tables', COALESCE((
    SELECT jsonb_object_agg(t.relname, jsonb_build_object(
      'columns', COALESCE((
        SELECT jsonb_object_agg(a.attname, jsonb_build_object(
          'type', CASE WHEN ty.typtype = 'e' THEN ty.typname ELSE format_type(a.atttypid, a.atttypmod) END,
          'notNull', a.attnotnull,
          'default', pg_get_expr(d.adbin, d.adrelid)
        ))
        FROM pg_attribute a JOIN pg_type ty ON ty.oid = a.atttypid
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
      ), '{}'::jsonb),
      'indexes', COALESCE((
        SELECT jsonb_object_agg(ic.relname, jsonb_build_object(
          'unique', ix.indisunique, 'method', am.amname,
          'predicate', pg_get_expr(ix.indpred, ix.indrelid), 'valid', ix.indisvalid AND ix.indisready,
          'options', (SELECT jsonb_agg(k.option ORDER BY k.ordinality)
            FROM unnest(ix.indoption) WITH ORDINALITY k(option, ordinality)),
          'columns', (SELECT jsonb_agg(a.attname ORDER BY k.ordinality)
            FROM unnest(ix.indkey) WITH ORDINALITY k(attnum, ordinality)
            LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum)
        ))
        FROM pg_index ix JOIN pg_class ic ON ic.oid = ix.indexrelid
        JOIN pg_am am ON am.oid = ic.relam WHERE ix.indrelid = t.oid
      ), '{}'::jsonb),
      'constraints', COALESCE((
        SELECT jsonb_object_agg(c.conname,
          jsonb_build_object('kind', c.contype, 'deferrable', c.condeferrable,
            'initiallyDeferred', c.condeferred, 'validated', c.convalidated, 'columns',
            (SELECT jsonb_agg(a.attname ORDER BY k.ordinality)
              FROM unnest(c.conkey) WITH ORDINALITY k(attnum, ordinality)
              JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum))
          || CASE WHEN c.contype = 'f' THEN jsonb_build_object(
            'foreignSchema', (SELECT n.nspname FROM pg_class r JOIN pg_namespace n ON n.oid = r.relnamespace WHERE r.oid = c.confrelid),
            'foreignTable', (SELECT relname FROM pg_class WHERE oid = c.confrelid),
            'foreignColumns', (SELECT jsonb_agg(a.attname ORDER BY k.ordinality)
              FROM unnest(c.confkey) WITH ORDINALITY k(attnum, ordinality)
              JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum),
            'delete', c.confdeltype, 'update', c.confupdtype
          ) ELSE '{}'::jsonb END
        ) FROM pg_constraint c WHERE c.conrelid = t.oid
          -- PostgreSQL 18 also catalogs NOT NULL; attnotnull above already covers it.
          AND (c.contype <> 'n' OR NOT c.convalidated)
      ), '{}'::jsonb)
    ))
    FROM pg_class t JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relkind IN ('r', 'p') AND t.relname <> '_prisma_migrations'
  ), '{}'::jsonb)
) AS catalog`;

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export function baselineDifferences(expected: unknown, actual: unknown, path = "catalog"): string[] {
  if (canonical(expected) === canonical(actual)) return [];
  if (expected === undefined) return [`${path}: unexpected`];
  if (actual === undefined) return [`${path}: missing`];
  if (expected && actual && typeof expected === "object" && typeof actual === "object"
    && !Array.isArray(expected) && !Array.isArray(actual)) {
    const wanted = expected as Record<string, unknown>;
    const found = actual as Record<string, unknown>;
    return [...new Set([...Object.keys(wanted), ...Object.keys(found)])].sort()
      .flatMap((key) => baselineDifferences(wanted[key], found[key], `${path}.${key}`));
  }
  // Report locations, not SQL defaults or values that could contain sensitive data.
  return [`${path}: differs`];
}

export async function runMigrations(mode = "--check") {
  if (mode === "--status") mode = "--check";
  if (!["--check", "--apply", "--adopt-prisma"].includes(mode)) throw new Error("Use --check/--status, --apply, or --adopt-prisma.");
  loadEnvConfig(process.cwd());
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (mode !== "--check" && (process.env.ALLOW_DATABASE_MIGRATIONS !== "true" || process.env.DATABASE_TARGET_HOST !== url.hostname)) {
    throw new Error("Writes require ALLOW_DATABASE_MIGRATIONS=true and DATABASE_TARGET_HOST matching the verified target hostname.");
  }
  const client = neon(url.toString());
  const migrations = readMigrationFiles({ migrationsFolder: migrationFolder });
  const baseline = migrations[0];
  if (!baseline) throw new Error("Baseline migration missing.");
  const [catalogResult] = await client.query(catalogSql);
  const actual = catalogResult.catalog as Catalog;
  const expected = expectedBaselineCatalog();
  const matchesBaseline = canonical(actual) === canonical(expected);
  const [state] = await client.query(`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS journal, to_regclass('public._prisma_migrations') IS NOT NULL AS legacy`);
  const applied = state.journal
    ? await client.query('SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id')
    : [];
  for (const [index, migration] of applied.entries()) {
    if (migrations[index]?.hash !== migration.hash || Number(migrations[index]?.folderMillis) !== Number(migration.created_at)) {
      throw new Error("Drizzle journal does not match the checked-in migration history.");
    }
  }
  const empty = Object.keys(actual.tables).length === 0 && Object.keys(actual.enums).length === 0;
  console.log(JSON.stringify({
    targetHost: url.hostname, mode, applied: applied.length, pending: migrations.length - applied.length,
    legacyPrisma: state.legacy, matchesBaseline, empty,
  }));
  if (!empty && !matchesBaseline && applied.length <= 1) {
    const differences = baselineDifferences(expected, actual);
    console.error(`Baseline schema mismatch (${differences.length} difference(s)):\n${differences.slice(0, 20).join("\n")}${differences.length > 20 ? "\nAdditional differences omitted." : ""}`);
  }
  if (mode === "--check") {
    if (!applied.length && !empty && !matchesBaseline) throw new Error("Database differs from the baseline; adoption is unsafe.");
    if (applied.length === 1 && !matchesBaseline) throw new Error("Database drifted from the applied baseline.");
    return;
  }
  if (mode === "--adopt-prisma" && applied.length) {
    if (applied.length === 1 && !matchesBaseline) throw new Error("Database drifted from the adopted baseline.");
    console.log("Baseline already adopted; no changes.");
    return;
  }
  const journalSql = [
    "CREATE SCHEMA IF NOT EXISTS drizzle",
    'CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)',
  ];
  const noAppliedGuard = `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations) THEN
      RAISE EXCEPTION 'Migration journal changed concurrently; retry after checking it';
    END IF;
  END $$`;
  const lockSql = "SELECT pg_advisory_xact_lock(20260914, 165843)";
  if (mode === "--adopt-prisma") {
    if (!matchesBaseline || !state.legacy) throw new Error("Adoption requires the exact initial schema and a verified Prisma migration record.");
    const checksum = createHash("sha256").update(readFileSync(baselinePath)).digest("hex");
    const guard = `DO $$ BEGIN
      IF (SELECT count(*) FROM public._prisma_migrations WHERE rolled_back_at IS NULL) <> 1
        OR NOT EXISTS (SELECT 1 FROM public._prisma_migrations
          WHERE migration_name = ${literal(legacyMigration)} AND checksum = ${literal(checksum)}
          AND finished_at IS NOT NULL AND rolled_back_at IS NULL AND applied_steps_count > 0)
      THEN RAISE EXCEPTION 'Prisma migration history does not match the immutable initial migration'; END IF;
      IF (${catalogSql}) IS DISTINCT FROM ${literal(JSON.stringify(expected))}::jsonb
      THEN RAISE EXCEPTION 'Schema changed or differs from the baseline'; END IF;
    END $$`;
    await client.transaction([
      client.query(lockSql), ...journalSql.map((query) => client.query(query)),
      client.query(`LOCK TABLE ${Object.keys(expected.tables).map((name) => `"public"."${name}"`).join(", ")} IN ACCESS SHARE MODE`),
      client.query(noAppliedGuard), client.query(guard),
      client.query("INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)", [baseline.hash, baseline.folderMillis]),
    ]);
    console.log("Verified Prisma baseline adopted without modifying application tables or data.");
    return;
  }
  if (!applied.length && (!empty || state.legacy)) throw new Error("Existing database requires --adopt-prisma; refusing to recreate tables.");
  if (applied.length === 1 && !matchesBaseline) throw new Error("Database drifted from the applied baseline.");
  const pending = migrations.slice(applied.length);
  if (!pending.length) return;
  const journalGuard = applied.length
    ? `DO $$ BEGIN IF (SELECT jsonb_agg(jsonb_build_object('hash', hash, 'created_at', created_at::text) ORDER BY created_at, id) FROM drizzle.__drizzle_migrations)
        IS DISTINCT FROM ${literal(JSON.stringify(applied.map((row) => ({ hash: row.hash, created_at: String(row.created_at) }))))}::jsonb
        THEN RAISE EXCEPTION 'Migration journal changed concurrently'; END IF; END $$`
    : noAppliedGuard;
  await client.transaction([
    client.query(lockSql), ...journalSql.map((query) => client.query(query)), client.query(journalGuard),
    ...pending.flatMap((migration) => [
      // The retained Prisma SQL has no Drizzle breakpoints; later Kit migrations do.
      ...((migration === baseline ? migration.sql.join("\n").split(/;\s*(?=--|$)/) : migration.sql)
        .filter((query) => query.trim()).map((query) => client.query(query))),
      client.query("INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)", [migration.hash, migration.folderMillis]),
    ]),
  ]);
  console.log(`Applied ${pending.length} migration(s) atomically.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigrations(process.argv[2]).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Migration failed.");
    process.exitCode = 1;
  });
}
