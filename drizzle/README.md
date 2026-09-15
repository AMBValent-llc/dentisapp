# Database migrations

`0000_prisma_baseline.sql` is the **byte-for-byte original Prisma initial
migration** (`20260914165843_init`). Never edit it after adoption. Its checksum
verifies the legacy migration record, and its catalog is the adoption contract.
The Drizzle snapshot represents the same physical schema; UUID generation and
`updatedAt` initialization/updates run in the application, not database defaults.

Run commands from the repository root. `DATABASE_URL` is loaded from the usual
Next.js environment files unless already supplied by the environment. Never log
or commit connection strings.

## Validate before deployment

Use a disposable, non-production Neon branch first. Set `DATABASE_URL` to its
connection string, and confirm the hostname belongs to that branch:

```sh
npx tsx scripts/migrate.ts --check
```

This command is read-only. It reports the target hostname, migration status, and
whether the database matches the baseline. The baseline check compares all public
application tables, columns, types, timestamp precision, nullability, defaults,
indexes, primary/foreign keys and their actions, and enums. Unexpected public
tables or schema drift prevent baseline adoption.

Before either write command, explicitly authorize and confirm the chosen target:

```sh
export ALLOW_DATABASE_MIGRATIONS=true
export DATABASE_TARGET_HOST=ep-your-isolated-branch.region.aws.neon.tech
```

### Fresh database

```sh
npx tsx scripts/migrate.ts --apply
npx tsx scripts/migrate.ts --check
```

`--apply` refuses a preexisting, unjournaled database. It applies pending SQL and
records the migration journal in one atomic Neon HTTP transaction.

### Existing Prisma database

```sh
npx tsx scripts/migrate.ts --adopt-prisma
npx tsx scripts/migrate.ts --check
```

Adoption requires an exact baseline schema and exactly one successful, active
Prisma migration with the original migration name and SHA-256 checksum. Within a
transaction, it locks against competing migration runs, rechecks the schema and
legacy record, then creates only `drizzle.__drizzle_migrations` and its containing
schema and records the baseline. It does **not** replay the initial SQL, delete the
Prisma journal, or modify application rows. Repeating adoption is a no-op after
validating the existing Drizzle journal.

If validation fails, investigate the discrepancy; do not use `push`, reset the
database, or manually stamp the journal to bypass it.

### Later schema changes

Generate SQL with `npx drizzle-kit generate`, review it, and test `--apply` on an
isolated branch before deployment. Use **this migration wrapper**, not
`drizzle-kit migrate`: the retained baseline intentionally has original Prisma
formatting rather than Drizzle statement breakpoints. The wrapper also validates
applied migration hashes and serializes concurrent runs.

## Demo seed

Only run this explicitly against a verified non-production test branch:

```sh
NODE_ENV=test ALLOW_DEMO_SEED=true npx tsx scripts/seed.ts
```

`DATABASE_TARGET_HOST` must still match `DATABASE_URL`. The seed refuses production
mode, is not invoked when imported, and preserves the existing Spanish demo
content and stable demo IDs. Repeated runs update the same records. Patient
natural-key conflicts retain the existing patient ID and link clinical records
to that ID. The demo account is `admin@docli.local` with the development-only
password `DocliDemo2026!`; never seed it in production.

After migrations, run the application's tests and build, including auth,
tenant-scoped queries, relations, timestamps, and seed idempotency. No deployment
is part of migration generation, checking, or validation.
