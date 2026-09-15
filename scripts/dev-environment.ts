import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";

const localEnvPath = resolve(process.cwd(), ".env.local");
const neonCli = "neonctl@4.18.0";

function cleanValue(value: string) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2
    && ((trimmed.startsWith('"') && trimmed.endsWith('"'))
      || (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function readEnvValue(source: string, key: string) {
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match?.[1] === key) return cleanValue(match[2]);
  }
  return undefined;
}

export function updateEnvText(source: string, values: Record<string, string>) {
  const pending = new Map(Object.entries(values));
  const lines = source.split(/\r?\n/).filter((line, index, all) => line || index < all.length - 1);
  const updated = lines.flatMap((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
    if (!match || !pending.has(match[1])) return [line];
    const value = pending.get(match[1]);
    pending.delete(match[1]);
    return value === undefined ? [] : [`${match[1]}=${JSON.stringify(value)}`];
  });
  for (const [key, value] of pending) updated.push(`${key}=${JSON.stringify(value)}`);
  return `${updated.join("\n")}\n`;
}

export function writePrivateEnv(path: string, content: string) {
  writeFileSync(path, content);
  chmodSync(path, 0o600);
}

export function chooseLocalSecret(
  source: string,
  provisioned: boolean,
  generate = () => randomBytes(32).toString("base64"),
) {
  const explicit = readEnvValue(source, "BETTER_AUTH_SECRET");
  return !provisioned && explicit && Buffer.byteLength(explicit) >= 32 ? explicit : generate();
}

function parseDatabaseUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

function isLoopbackOrigin(value: string) {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      && ["http:", "https:"].includes(url.protocol)
      && !url.username
      && !url.password
      && url.pathname === "/"
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function developmentEnvironmentErrors(
  env: Record<string, string | undefined>,
  source = ".env.local",
) {
  const errors: string[] = [];
  const databaseUrl = parseDatabaseUrl(env.DATABASE_URL);
  if (!databaseUrl) {
    errors.push(`DATABASE_URL is missing or invalid in ${source}.`);
  } else {
    if (databaseUrl.protocol !== "postgresql:" && databaseUrl.protocol !== "postgres:") {
      errors.push("DATABASE_URL must use the postgresql protocol.");
    }
    if (!databaseUrl.hostname.endsWith(".neon.tech")) {
      errors.push("DATABASE_URL must target Neon; the current HTTP driver does not support local PostgreSQL.");
    }
    if (!databaseUrl.username || !databaseUrl.password || !databaseUrl.pathname.slice(1)) {
      errors.push("DATABASE_URL must include a role, password, and database.");
    }
    if (databaseUrl.searchParams.get("sslmode") === "disable") {
      errors.push("DATABASE_URL must not disable TLS.");
    }
  }
  if (!env.BETTER_AUTH_SECRET || Buffer.byteLength(env.BETTER_AUTH_SECRET) < 32) {
    errors.push("BETTER_AUTH_SECRET must contain at least 32 bytes.");
  }
  for (const key of ["BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"] as const) {
    if (env[key] && !isLoopbackOrigin(env[key])) {
      errors.push(`${key} must be a clean loopback origin for local development.`);
    }
  }
  return errors;
}

function loadDevelopmentEnv() {
  loadEnvConfig(process.cwd(), true);
}

function checkEnvironment() {
  loadDevelopmentEnv();
  const errors = developmentEnvironmentErrors(process.env);
  if (errors.length) {
    throw new Error(
      `Local backend configuration is incomplete:\n- ${errors.join("\n- ")}\n`
      + "Run `npm run dev:setup` to create an isolated temporary Neon database, then retry `npm run dev`.",
    );
  }
  verifyMigrations(process.env.DATABASE_URL!);
  console.log(`Local backend ready: ${new URL(process.env.DATABASE_URL!).hostname}`);
}

function redact(text: string) {
  return text.replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED_DATABASE_URL]");
}

export function parseClaimState(output: string) {
  return output.match(/^State\s+(\S+)/m)?.[1]?.toLowerCase();
}

function removeReplaceableClaimContext() {
  const contextPath = resolve(process.cwd(), ".neon");
  if (!existsSync(contextPath)) return;
  let projectId: string;
  try {
    const context = JSON.parse(readFileSync(contextPath, "utf8")) as { projectId?: unknown };
    if (typeof context.projectId !== "string" || !context.projectId) throw new Error();
    projectId = context.projectId;
  } catch {
    throw new Error("Existing .neon context is invalid; refusing to replace it automatically.");
  }
  const status = spawnSync(
    "npx",
    ["--yes", neonCli, "claim", "status", projectId],
    { encoding: "utf8" },
  );
  if (status.error) throw status.error;
  if (status.status !== 0) {
    throw new Error(`Could not verify the existing Neon claim context:\n${redact(status.stderr || status.stdout)}`);
  }
  const state = parseClaimState(status.stdout);
  if (state !== "unclaimed" && state !== "expired") {
    throw new Error(`Existing .neon context is ${state ?? "unknown"}; refusing to replace it automatically.`);
  }
  const removal = spawnSync(
    "npx",
    ["--yes", neonCli, "claim", "delete", projectId, "--yes"],
    { encoding: "utf8" },
  );
  if (removal.error) throw removal.error;
  if (removal.status !== 0) {
    throw new Error(`Could not remove the replaceable Neon claim context:\n${redact(removal.stderr || removal.stdout)}`);
  }
  if (existsSync(contextPath)) unlinkSync(contextPath);
  console.log(`Removed the previous ${state} temporary Neon project.`);
}

function provisionTemporaryDatabase() {
  removeReplaceableClaimContext();
  const result = spawnSync(
    "npx",
    ["--yes", neonCli, "claim", "create", "--file", localEnvPath],
    { encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Neon temporary project creation failed:\n${redact(result.stderr || result.stdout)}`);
  }
  const expires = result.stdout.match(/Project Expires At\s+(.+)/)?.[1]?.trim();
  console.log(`Created an isolated temporary Neon project${expires ? ` (expires ${expires})` : ""}.`);
}

function runMigration(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/migrate.ts", "--apply"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        ALLOW_DATABASE_MIGRATIONS: "true",
        DATABASE_TARGET_HOST: url.hostname,
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Database migration failed:\n${redact(result.stderr || result.stdout)}`);
  }
  console.log("Applied the checked-in database migrations.");
}

type MigrationState = {
  applied: number;
  pending: number;
  matchesBaseline: boolean;
};

export function parseMigrationState(output: string): MigrationState | undefined {
  for (const line of output.split(/\r?\n/)) {
    try {
      const value = JSON.parse(line) as Partial<MigrationState>;
      if (
        typeof value.applied === "number"
        && typeof value.pending === "number"
        && typeof value.matchesBaseline === "boolean"
      ) {
        return {
          applied: value.applied,
          pending: value.pending,
          matchesBaseline: value.matchesBaseline,
        };
      }
    } catch {
      // Migration output also contains human-readable status lines.
    }
  }
  return undefined;
}

function verifyMigrations(databaseUrl: string) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/migrate.ts", "--check"],
    { encoding: "utf8", env: { ...process.env, DATABASE_URL: databaseUrl } },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Database validation failed:\n${redact(result.stderr || result.stdout)}`);
  }
  const state = parseMigrationState(result.stdout);
  if (!state) throw new Error("Database validation returned an unrecognized result.");
  if (state.pending || !state.matchesBaseline) {
    throw new Error(
      `Database is not ready (${state.pending} pending migration(s)). `
      + "Run `npm run dev:setup` with the verified target host before starting Next.",
    );
  }
}

function setupEnvironment() {
  const source = existsSync(localEnvPath) ? readFileSync(localEnvPath, "utf8") : "";
  loadDevelopmentEnv();
  let databaseUrl = process.env.DATABASE_URL;
  let provisioned = false;
  if (!databaseUrl) {
    provisionTemporaryDatabase();
    const localEnv = readFileSync(localEnvPath, "utf8");
    databaseUrl = readEnvValue(localEnv, "DATABASE_URL");
    provisioned = true;
  }
  if (!databaseUrl) throw new Error("Neon did not write DATABASE_URL to .env.local.");

  const currentSource = existsSync(localEnvPath) ? readFileSync(localEnvPath, "utf8") : source;
  const secret = chooseLocalSecret(source, provisioned);
  const configured = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: "http://localhost:3000",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  };
  const errors = developmentEnvironmentErrors(configured);
  if (errors.length) throw new Error(`Refusing invalid local configuration:\n- ${errors.join("\n- ")}`);
  const targetHost = new URL(databaseUrl).hostname;
  if (!provisioned && process.env.DATABASE_TARGET_HOST !== targetHost) {
    throw new Error(
      "An existing database requires explicit host confirmation. "
      + `Retry with DATABASE_TARGET_HOST=${targetHost} npm run dev:setup.`,
    );
  }
  writePrivateEnv(localEnvPath, updateEnvText(currentSource, {
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: "http://localhost:3000",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  }));
  runMigration(databaseUrl);
  verifyMigrations(databaseUrl);
  console.log("Local backend configuration is ready in .env.local. Run `npm run dev`.");
}

export function runDevEnvironment(mode = process.argv[2]) {
  if (mode === "--check") return checkEnvironment();
  if (mode === "--setup") return setupEnvironment();
  throw new Error("Use --check or --setup.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runDevEnvironment();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
