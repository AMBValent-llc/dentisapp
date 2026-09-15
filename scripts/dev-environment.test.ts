import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  chooseLocalSecret,
  developmentEnvironmentErrors,
  parseClaimState,
  parseMigrationState,
  readEnvValue,
  updateEnvText,
  writePrivateEnv,
} from "./dev-environment";

const valid = {
  DATABASE_URL: "postgresql://docli:private@ep-example.us-east-2.aws.neon.tech/docli?sslmode=require",
  BETTER_AUTH_SECRET: "a-secure-development-secret-with-32-bytes",
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3001",
};

test("development preflight accepts a complete isolated Neon configuration", () => {
  assert.deepEqual(developmentEnvironmentErrors(valid), []);
});

test("development preflight rejects missing, non-Neon, insecure, and remote configuration", () => {
  assert.match(developmentEnvironmentErrors({}).join("\n"), /DATABASE_URL is missing/);
  const errors = developmentEnvironmentErrors({
    DATABASE_URL: "postgresql://docli:private@localhost/docli?sslmode=disable",
    BETTER_AUTH_SECRET: "short",
    BETTER_AUTH_URL: "https://production.example.com",
  }).join("\n");
  assert.match(errors, /must target Neon/);
  assert.match(errors, /must not disable TLS/);
  assert.match(errors, /at least 32 bytes/);
  assert.match(errors, /clean loopback origin/);
});

test("environment updates preserve unrelated Neon metadata and replace managed keys", () => {
  const source = [
    "# Managed locally",
    'DATABASE_URL="old"',
    'NEON_BRANCH="br-example"',
    'BETTER_AUTH_SECRET="old"',
    "",
  ].join("\n");
  const updated = updateEnvText(source, {
    DATABASE_URL: valid.DATABASE_URL,
    BETTER_AUTH_SECRET: valid.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: valid.BETTER_AUTH_URL,
  });
  assert.equal(readEnvValue(updated, "DATABASE_URL"), valid.DATABASE_URL);
  assert.equal(readEnvValue(updated, "BETTER_AUTH_SECRET"), valid.BETTER_AUTH_SECRET);
  assert.equal(readEnvValue(updated, "BETTER_AUTH_URL"), valid.BETTER_AUTH_URL);
  assert.equal(readEnvValue(updated, "NEON_BRANCH"), "br-example");
  assert.equal(updated.match(/^DATABASE_URL=/gm)?.length, 1);
  assert(!updated.includes('"old"'));
});

test("migration preflight recognizes only complete structured status", () => {
  assert.deepEqual(parseMigrationState([
    "informational line",
    '{"applied":1,"pending":0,"matchesBaseline":true,"targetHost":"example"}',
  ].join("\n")), { applied: 1, pending: 0, matchesBaseline: true });
  assert.equal(parseMigrationState('{"pending":0}'), undefined);
  assert.equal(parseMigrationState("not json"), undefined);
});

test("setup never reuses an ambient secret for a newly provisioned database", () => {
  const generated = "generated-local-secret-with-at-least-32-bytes";
  assert.equal(chooseLocalSecret('BETTER_AUTH_SECRET="explicit-local-secret-with-at-least-32-bytes"\n', false), "explicit-local-secret-with-at-least-32-bytes");
  assert.equal(chooseLocalSecret('BETTER_AUTH_SECRET="explicit-local-secret-with-at-least-32-bytes"\n', true, () => generated), generated);
  assert.equal(chooseLocalSecret("", false, () => generated), generated);
});

test("setup makes an existing dotenv file private", () => {
  const directory = mkdtempSync(join(tmpdir(), "docli-dev-env-"));
  try {
    const path = join(directory, ".env.local");
    writeFileSync(path, "DATABASE_URL=old\n");
    chmodSync(path, 0o644);
    writePrivateEnv(path, "DATABASE_URL=new\n");
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(readFileSync(path, "utf8"), "DATABASE_URL=new\n");
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("claim lifecycle parser recognizes replaceable states", () => {
  assert.equal(parseClaimState("Project Id  example\nState       unclaimed\n"), "unclaimed");
  assert.equal(parseClaimState("State  expired\n"), "expired");
  assert.equal(parseClaimState("State  claimed\n"), "claimed");
  assert.equal(parseClaimState("no state"), undefined);
});
