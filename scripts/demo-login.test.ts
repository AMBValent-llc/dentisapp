import assert from "node:assert/strict";
import { test } from "node:test";
import { fillDemoLoginCredentials, getDemoLoginCredentials } from "../lib/demo-login";

const configuredDevelopment = {
  NODE_ENV: "development",
  ENABLE_DEMO_LOGIN: "true",
  DEMO_EMAIL: " Demo@Docli.Local ",
  DEMO_PASSWORD: "local-demo-password",
};

test("demo login is visible only with complete development configuration", () => {
  assert.deepEqual(getDemoLoginCredentials(configuredDevelopment), {
    email: "demo@docli.local",
    password: "local-demo-password",
  });
  assert.equal(getDemoLoginCredentials({ ...configuredDevelopment, ENABLE_DEMO_LOGIN: "false" }), null);
  assert.equal(getDemoLoginCredentials({ ...configuredDevelopment, DEMO_PASSWORD: "" }), null);
});

test("demo login remains disabled in production even if credentials are configured", () => {
  assert.equal(getDemoLoginCredentials({ ...configuredDevelopment, NODE_ENV: "production" }), null);
});

test("demo login fills both controlled form values without modifying credentials", () => {
  const credentials = getDemoLoginCredentials(configuredDevelopment);
  assert(credentials);
  assert.deepEqual(fillDemoLoginCredentials(credentials), {
    email: "demo@docli.local",
    password: "local-demo-password",
  });
});
