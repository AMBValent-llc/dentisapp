import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { stagingEnvironmentErrors, verifyAccess } from "./staging-deployment";

const safe = {
  APP_ENV: "staging",
  ENABLE_DEMO_LOGIN: "true",
  STAGING_URL: "https://mediflow-demo.accounts-865.workers.dev",
  BETTER_AUTH_URL: "https://mediflow-demo.accounts-865.workers.dev",
  DEMO_ALLOWED_ORIGIN: "https://mediflow-demo.accounts-865.workers.dev",
  DEMO_ALLOWED_HOSTNAME: "mediflow-demo.accounts-865.workers.dev",
  PRODUCTION_HOSTNAME: "mediflow.accounts-865.workers.dev",
  DATABASE_URL: "postgresql://demo:secret@demo.neon.tech/docli?sslmode=require",
  DATABASE_TARGET_HOST: "demo.neon.tech",
  PRODUCTION_DATABASE_HOST: "production.neon.tech",
  BETTER_AUTH_SECRET: "a-secret-with-at-least-thirty-two-characters",
  DEMO_EMAIL: "demo@example.test",
  DEMO_PASSWORD: "demo-password",
};

test("staging preflight accepts only an isolated production build", () => {
  assert.deepEqual(stagingEnvironmentErrors(safe), []);
  assert.match(stagingEnvironmentErrors({ ...safe, APP_ENV: "production" }).join(""), /APP_ENV/);
  assert.match(stagingEnvironmentErrors({ ...safe, STAGING_URL: `https://${safe.PRODUCTION_HOSTNAME}` }).join(""), /BETTER_AUTH_URL/);
  assert.match(stagingEnvironmentErrors({ ...safe, PRODUCTION_HOSTNAME: undefined }).join(""), /PRODUCTION_HOSTNAME/);
  assert.match(stagingEnvironmentErrors({ ...safe, PRODUCTION_HOSTNAME: "https://app.example.test" }).join(""), /PRODUCTION_HOSTNAME/);
  assert.match(stagingEnvironmentErrors({ ...safe, PRODUCTION_HOSTNAME: safe.DEMO_ALLOWED_HOSTNAME }).join(""), /production hostname/);
  assert.match(stagingEnvironmentErrors({ ...safe, PRODUCTION_DATABASE_HOST: safe.DATABASE_TARGET_HOST }).join(""), /production database/);
});

test("staging environment has a separate Worker and explicit non-secret gates", () => {
  const config = readFileSync("wrangler.jsonc", "utf8");
  assert.match(config, /"staging"\s*:\s*\{/);
  assert.match(config, /"name"\s*:\s*"mediflow-demo"/);
  assert.match(config, /"APP_ENV"\s*:\s*"staging"/);
  assert.match(config, /"DEMO_ALLOWED_ORIGIN"\s*:\s*"https:\/\/mediflow-demo\.accounts-865\.workers\.dev"/);
  assert.match(config, /"DEMO_ALLOWED_HOSTNAME"\s*:\s*"mediflow-demo\.accounts-865\.workers\.dev"/);
  assert.doesNotMatch(config, /DEMO_PASSWORD|DATABASE_URL|BETTER_AUTH_SECRET/);
});

test("Access verification rejects a publicly reachable staging login", async () => {
  await assert.rejects(
    verifyAccess(safe, async () => new Response("public", { status: 200 })),
    /Cloudflare Access/,
  );
  await assert.rejects(
    verifyAccess(safe, async () => new Response("worker denial", { status: 403, headers: { "cf-ray": "fake" } })),
    /Cloudflare Access/,
  );
  await assert.rejects(
    verifyAccess(safe, async () => new Response(null, {
      status: 302,
      headers: { Location: "https://example.test/?next=team.cloudflareaccess.com/cdn-cgi/access/login/app" },
    })),
    /Cloudflare Access/,
  );
  await verifyAccess(safe, async () => new Response(null, {
    status: 302,
    headers: { Location: "https://team.cloudflareaccess.com/cdn-cgi/access/login/app" },
  }));
});
