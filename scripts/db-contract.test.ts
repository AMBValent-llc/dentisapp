import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { eq, getTableName, is, SQL } from "drizzle-orm";
import { getTableConfig, PgDialect, PgTable } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";

loadEnvConfig(process.cwd());

assert.equal(process.env.ALLOW_DATABASE_TESTS, "1", "Set ALLOW_DATABASE_TESTS=1 only for an isolated database.");
assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required.");
assert.ok(process.env.TEST_DATABASE_HOST, "TEST_DATABASE_HOST must identify the isolated Neon endpoint.");
assert.equal(new URL(process.env.DATABASE_URL).hostname, process.env.TEST_DATABASE_HOST, "Unexpected database target.");

const query = neon(process.env.DATABASE_URL);
const schemaValues: unknown[] = Object.values(schema);
const tables = schemaValues.filter((value): value is PgTable => is(value, PgTable));
const dialect = new PgDialect();

function normalizeDefault(value: string | null) {
  return value?.replace(/::(?:text|"[^"]+")$/, "").replace(/^\((.*)\)$/, "$1").trim() ?? null;
}

test("Drizzle preserves the deployed PostgreSQL columns, defaults, indexes, enums and foreign keys", async () => {
  const columns = z.array(z.object({
    tableName: z.string(),
    columnName: z.string(),
    type: z.string(),
    notNull: z.boolean(),
    defaultValue: z.string().nullable(),
  })).parse(await query`
    SELECT c.relname AS "tableName", a.attname AS "columnName",
           format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull AS "notNull",
           pg_get_expr(d.adbin, d.adrelid) AS "defaultValue"
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
  `);
  const indexes = z.array(z.object({
    tableName: z.string(), name: z.string(), unique: z.boolean(), primary: z.boolean(), columns: z.array(z.string()),
  })).parse(await query`
    SELECT t.relname AS "tableName", i.relname AS name, x.indisunique AS unique, x.indisprimary AS primary,
           ARRAY(SELECT a.attname::text FROM unnest(x.indkey) WITH ORDINALITY AS k(attnum, position)
                 JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum ORDER BY k.position) AS columns
    FROM pg_index x JOIN pg_class t ON t.oid = x.indrelid JOIN pg_class i ON i.oid = x.indexrelid
    WHERE t.relnamespace = 'public'::regnamespace
  `);
  const action = z.enum(["a", "r", "c", "n", "d"]);
  const foreignKeys = z.array(z.object({
    name: z.string(), tableName: z.string(), foreignTableName: z.string(),
    columns: z.array(z.string()), foreignColumns: z.array(z.string()), onDelete: action, onUpdate: action,
  })).parse(await query`
    SELECT c.conname AS name, t.relname AS "tableName", f.relname AS "foreignTableName",
           c.confdeltype AS "onDelete", c.confupdtype AS "onUpdate",
           ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, position)
                 JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum ORDER BY k.position) AS columns,
           ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, position)
                 JOIN pg_attribute a ON a.attrelid = f.oid AND a.attnum = k.attnum ORDER BY k.position) AS "foreignColumns"
    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_class f ON f.oid = c.confrelid
    WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
  `);
  const enumValues = z.array(z.object({ name: z.string(), values: z.array(z.string()) })).parse(await query`
    SELECT t.typname AS name, array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS values
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typnamespace = 'public'::regnamespace GROUP BY t.typname
  `);
  const actions = { a: "no action", r: "restrict", c: "cascade", n: "set null", d: "set default" };
  assert.equal(tables.length, 16);

  for (const table of tables) {
    const config = getTableConfig(table);
    const actualColumns = columns.filter((column) => column.tableName === config.name);
    assert.equal(actualColumns.length, config.columns.length, `${config.name}: column count`);
    for (const column of config.columns) {
      const actual = actualColumns.find((candidate) => candidate.columnName === column.name);
      assert.ok(actual, `${config.name}.${column.name}: missing column`);
      assert.equal(actual.type.replace(" without time zone", "").replace(/^"(.*)"$/, "$1"), column.getSQLType().replace(/\s+\(/g, "("), `${config.name}.${column.name}: type`);
      assert.equal(actual.notNull, column.notNull, `${config.name}.${column.name}: nullability`);
      const expectedDefault = column.default === undefined ? null
        : is(column.default, SQL) ? dialect.sqlToQuery(column.default).sql
        : typeof column.default === "string" ? `'${column.default}'` : String(column.default);
      assert.equal(normalizeDefault(actual.defaultValue), normalizeDefault(expectedDefault), `${config.name}.${column.name}: SQL default`);
      if (column.enumValues?.length) {
        assert.deepEqual(enumValues.find((entry) => entry.name === column.getSQLType())?.values, column.enumValues);
      }
    }
    for (const index of config.indexes) {
      const actual = indexes.find((entry) => entry.tableName === config.name && entry.name === index.config.name);
      assert.ok(actual, `${config.name}: missing ${index.config.name}`);
      assert.equal(actual.unique, index.config.unique);
      assert.deepEqual(actual.columns, index.config.columns.map((column) => {
        assert.ok("name" in column, "Expected a column index, not an expression.");
        return column.name;
      }));
    }
    const primary = indexes.find((entry) => entry.tableName === config.name && entry.primary);
    assert.ok(primary, `${config.name}: missing primary key`);
    assert.deepEqual(primary.columns, config.columns.filter((column) => column.primary).map((column) => column.name));
    assert.equal(indexes.filter((entry) => entry.tableName === config.name).length, config.indexes.length + 1);
    assert.equal(foreignKeys.filter((entry) => entry.tableName === config.name).length, config.foreignKeys.length);
    for (const foreignKey of config.foreignKeys) {
      const actual = foreignKeys.find((entry) => entry.name === foreignKey.getName());
      assert.ok(actual, `${config.name}: missing ${foreignKey.getName()}`);
      const reference = foreignKey.reference();
      assert.equal(actual.foreignTableName, getTableName(reference.foreignTable));
      assert.deepEqual(actual.columns, reference.columns.map((column) => column.name));
      assert.deepEqual(actual.foreignColumns, reference.foreignColumns.map((column) => column.name));
      assert.equal(actions[actual.onDelete], foreignKey.onDelete);
      assert.equal(actions[actual.onUpdate], foreignKey.onUpdate);
    }
  }
});

test("Neon HTTP batches roll back organization creation when membership insertion fails", async () => {
  const id = randomUUID();
  await assert.rejects(db.batch([
    db.insert(schema.organizations).values({ id, name: "Rollback validation", slug: `rollback-${id}` }),
    db.insert(schema.memberships).values({ organizationId: id, userId: randomUUID(), role: "OWNER" }),
  ]));
  assert.equal(await db.query.organizations.findFirst({ where: eq(schema.organizations.id, id) }), undefined);
});
