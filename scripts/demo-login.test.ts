import assert from "node:assert/strict";
import { test } from "node:test";
import { fillDemoLoginCredentials, getDemoLoginCredentials } from "../lib/demo-login";

const configuredDevelopment = {
  NODE_ENV: "development",
  ENABLE_DEMO_LOGIN: "true",
  DEMO_EMAIL: " Demo@Docli.Local ",
  DEMO_PASSWORD: "local-demo-password",
};

test("demo login is visible only with complete local configuration on loopback", () => {
  assert.deepEqual(getDemoLoginCredentials(configuredDevelopment, "localhost:3000"), {
    email: "demo@docli.local",
    password: "local-demo-password",
  });
  assert.equal(getDemoLoginCredentials({ ...configuredDevelopment, ENABLE_DEMO_LOGIN: "false" }), null);
  assert.equal(getDemoLoginCredentials({ ...configuredDevelopment, DEMO_PASSWORD: "" }), null);
  assert.equal(getDemoLoginCredentials(configuredDevelopment, "example.com"), null);
  assert.deepEqual(getDemoLoginCredentials(configuredDevelopment, "[::1]:3000"), {
    email: "demo@docli.local",
    password: "local-demo-password",
  });
});

const configuredStaging = {
  NODE_ENV: "production",
  APP_ENV: "staging",
  ENABLE_DEMO_LOGIN: "true",
  DEMO_ALLOWED_ORIGIN: "https://demo.example.test",
  DEMO_ALLOWED_HOSTNAME: "demo.example.test",
  PRODUCTION_HOSTNAME: "app.example.test",
  BETTER_AUTH_URL: "https://demo.example.test",
  DATABASE_URL: "postgresql://demo:secret@demo-db.neon.tech/docli?sslmode=require",
  DATABASE_TARGET_HOST: "demo-db.neon.tech",
  PRODUCTION_DATABASE_HOST: "production-db.neon.tech",
  DEMO_EMAIL: "demo@example.test",
  DEMO_PASSWORD: "staging-demo-password",
};

test("production build exposes demo credentials only for the exact isolated staging target", () => {
  assert.deepEqual(getDemoLoginCredentials(configuredStaging, "demo.example.test"), {
    email: "demo@example.test",
    password: "staging-demo-password",
  });
  for (const unsafe of [
    { APP_ENV: "production" },
    { DEMO_ALLOWED_HOSTNAME: "app.example.test" },
    { PRODUCTION_HOSTNAME: undefined },
    { BETTER_AUTH_URL: "https://app.example.test" },
    { BETTER_AUTH_URL: "https://demo.example.test:444" },
    { BETTER_AUTH_URL: "https://demo.example.test/path" },
    { DATABASE_TARGET_HOST: "other-db.neon.tech" },
    { PRODUCTION_DATABASE_HOST: undefined },
    { PRODUCTION_DATABASE_HOST: "demo-db.neon.tech" },
  ]) {
    assert.equal(getDemoLoginCredentials({ ...configuredStaging, ...unsafe }, "demo.example.test"), null);
  }
  assert.equal(getDemoLoginCredentials(configuredStaging, "app.example.test"), null);
});

test("demo login fills both controlled form values without modifying credentials", () => {
  const credentials = getDemoLoginCredentials(configuredDevelopment);
  assert(credentials);
  assert.deepEqual(fillDemoLoginCredentials(credentials), {
    email: "demo@docli.local",
    password: "local-demo-password",
  });
});
