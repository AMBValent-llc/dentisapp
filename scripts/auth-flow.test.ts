import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuth } from "../lib/auth";

const localOrigin = "http://localhost:3001";
const productionOrigin = "https://mediflow.accounts-865.workers.dev";

function cookieFrom(response: Response) {
  const header = response.headers.get("set-cookie");
  assert(header, "Authentication response did not set a cookie");
  return header.split(";")[0];
}

async function request(
  auth: ReturnType<typeof createAuth>,
  origin: string,
  path: string,
  method = "GET",
  body?: Record<string, string>,
  cookie?: string,
) {
  return auth.handler(new Request(`${origin}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }));
}

test("a valid user can sign up, sign out, sign in, and restore a local session", async () => {
  const auth = createAuth({
    configuredURL: productionOrigin,
    production: false,
    request: new Request(`${localOrigin}/api/auth/get-session`),
    secret: "test-secret-with-at-least-thirty-two-characters",
  });
  const identity = {
    name: "Auth Contract",
    email: "auth-contract@example.test",
    password: "AuthContract2026!",
  };

  const signup = await request(auth, localOrigin, "/api/auth/sign-up/email", "POST", identity);
  assert.equal(signup.status, 200, await signup.text());
  const signupCookie = cookieFrom(signup);
  const signupSetCookie = signup.headers.get("set-cookie") ?? "";
  assert.match(signupSetCookie, /httponly/i);
  assert.match(signupSetCookie, /samesite=lax/i);

  const signout = await request(auth, localOrigin, "/api/auth/sign-out", "POST", {}, signupCookie);
  assert.equal(signout.status, 200, await signout.text());

  const signin = await request(auth, localOrigin, "/api/auth/sign-in/email", "POST", {
    email: identity.email,
    password: identity.password,
  });
  assert.equal(signin.status, 200, await signin.text());
  const sessionCookie = cookieFrom(signin);

  const session = await request(auth, localOrigin, "/api/auth/get-session", "GET", undefined, sessionCookie);
  assert.equal(session.status, 200);
  const sessionBody = await session.json() as { user?: { email?: string } };
  assert.equal(sessionBody.user?.email, identity.email);

  const invalidPassword = await request(auth, localOrigin, "/api/auth/sign-in/email", "POST", {
    email: identity.email,
    password: "NotThePassword2026!",
  });
  assert.equal(invalidPassword.status, 401);
  assert.equal((await invalidPassword.json() as { code?: string }).code, "INVALID_EMAIL_OR_PASSWORD");
});

test("the production backend still rejects a localhost cross-origin login", async () => {
  const auth = createAuth({
    configuredURL: productionOrigin,
    production: true,
    secret: "test-secret-with-at-least-thirty-two-characters",
  });
  const response = await auth.handler(new Request(`${productionOrigin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: localOrigin,
    },
    body: JSON.stringify({
      email: "auth-contract@example.test",
      password: "AuthContract2026!",
    }),
  }));
  assert.equal(response.status, 403);
  assert.equal((await response.json() as { code?: string }).code, "INVALID_ORIGIN");
});

test("production rejects missing or unsafe authentication origins", () => {
  const secret = "test-secret-with-at-least-thirty-two-characters";
  assert.throws(
    () => createAuth({ configuredURL: "", production: true, secret }),
    /BETTER_AUTH_URL is required/,
  );
  assert.throws(
    () => createAuth({ configuredURL: "http://localhost:3001", production: true, secret }),
    /must be an HTTPS origin/,
  );
  assert.throws(
    () => createAuth({ configuredURL: `${productionOrigin}/api/auth`, production: true, secret }),
    /must be an HTTPS origin/,
  );
});
