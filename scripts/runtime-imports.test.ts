import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("server modules import without build-time secrets and reject missing runtime database configuration", () => {
  const env = { ...process.env };
  for (const key of ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"]) delete env[key];
  const authUrl = new URL("../lib/auth.ts", import.meta.url).href;
  const dbUrl = new URL("../lib/db/index.ts", import.meta.url).href;
  const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    import assert from "node:assert/strict";
    await import(${JSON.stringify(authUrl)});
    const imported = await import(${JSON.stringify(dbUrl)});
    const database = imported.default ?? imported;
    assert.throws(() => database.getDb(), /DATABASE_URL is required/);
  `], { env, encoding: "utf8" });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
