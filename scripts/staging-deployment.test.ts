import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { stagingEnvironmentErrors, verifyAccess, verifyStaging } from "./staging-deployment";

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
  CF_ACCESS_CLIENT_ID: "test-access-client-id",
  CF_ACCESS_CLIENT_SECRET: "test-access-client-secret",
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

test("staging verification proves button, account, restored session, and dashboard access", async () => {
  const requests: Request[] = [];
  const responses = [
    new Response(null, {
      status: 302,
      headers: { Location: "https://team.cloudflareaccess.com/cdn-cgi/access/login/app" },
    }),
    new Response("<button>Completar cuenta de prueba</button>", { status: 200 }),
    new Response("{}", {
      status: 200,
      headers: { "Set-Cookie": "better-auth.session_token=verified; Path=/; HttpOnly; Secure" },
    }),
    Response.json({ user: { email: safe.DEMO_EMAIL } }),
    new Response("<main>Dashboard</main>", { status: 200 }),
  ];
  await verifyStaging(safe, async (input, init) => {
    requests.push(new Request(input, init));
    const response = responses.shift();
    assert(response, "Unexpected verification request.");
    return response;
  });
  assert.equal(requests[2].method, "POST");
  assert.equal(new URL(requests[2].url).pathname, "/api/auth/sign-in/email");
  assert.equal(requests[1].redirect, "manual");
  assert.equal(requests[2].redirect, "manual");
  assert.equal(requests[3].headers.get("cookie"), "better-auth.session_token=verified");
  assert.equal(new URL(requests[3].url).pathname, "/api/auth/get-session");
  assert.equal(requests[3].redirect, "manual");
  assert.equal(requests[4].headers.get("cookie"), "better-auth.session_token=verified");
  assert.equal(new URL(requests[4].url).pathname, "/dashboard");
  assert.equal(requests[4].redirect, "manual");
});

test("staging verification never follows a credential-bearing redirect", async () => {
  const responses = [
    new Response(null, {
      status: 302,
      headers: { Location: "https://team.cloudflareaccess.com/cdn-cgi/access/login/app" },
    }),
    new Response("<button>Completar cuenta de prueba</button>", { status: 200 }),
    new Response(null, {
      status: 307,
      headers: { Location: "https://attacker.example.test/collect" },
    }),
  ];
  const requests: Request[] = [];
  await assert.rejects(
    verifyStaging(safe, async (input, init) => {
      requests.push(new Request(input, init));
      const response = responses.shift();
      assert(response);
      return response;
    }),
    /did not authenticate/,
  );
  assert.equal(requests.length, 3);
  assert(requests.every((request) => request.redirect === "manual"));
});

test("session identity failures do not expose either email in the error", async () => {
  const responses = [
    new Response(null, {
      status: 302,
      headers: { Location: "https://team.cloudflareaccess.com/cdn-cgi/access/login/app" },
    }),
    new Response("<button>Completar cuenta de prueba</button>", { status: 200 }),
    new Response("{}", {
      status: 200,
      headers: { "Set-Cookie": "better-auth.session_token=verified; Path=/; HttpOnly; Secure" },
    }),
    Response.json({ user: { email: "unexpected-account@example.test" } }),
  ];
  await assert.rejects(
    verifyStaging(safe, async () => {
      const response = responses.shift();
      assert(response);
      return response;
    }),
    (error: unknown) => {
      assert(error instanceof Error);
      assert.doesNotMatch(error.message, /unexpected-account|demo@example/);
      return true;
    },
  );
});
