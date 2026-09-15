import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

type Environment = Record<string, string | undefined>;

function origin(value: string | undefined, name: string) {
  assert(value, `${name} is required.`);
  const parsed = new URL(value);
  assert.equal(parsed.protocol, "https:", `${name} must use HTTPS.`);
  assert.equal(parsed.origin, value, `${name} must be an origin without a path.`);
  return parsed;
}

export function stagingEnvironmentErrors(env: Environment) {
  const errors: string[] = [];
  try {
    assert.equal(env.APP_ENV, "staging", "APP_ENV must be staging.");
    assert.equal(env.ENABLE_DEMO_LOGIN, "true", "ENABLE_DEMO_LOGIN must be true.");
    const staging = origin(env.BETTER_AUTH_URL, "BETTER_AUTH_URL");
    const expected = origin(env.STAGING_URL, "STAGING_URL");
    assert.equal(staging.origin, expected.origin, "BETTER_AUTH_URL must match STAGING_URL.");
    assert.equal(env.DEMO_ALLOWED_ORIGIN, expected.origin, "DEMO_ALLOWED_ORIGIN must match staging.");
    assert.equal(staging.hostname, env.DEMO_ALLOWED_HOSTNAME, "DEMO_ALLOWED_HOSTNAME must match staging.");
    assert(env.PRODUCTION_HOSTNAME, "PRODUCTION_HOSTNAME is required.");
    assert.equal(env.PRODUCTION_HOSTNAME, new URL(`https://${env.PRODUCTION_HOSTNAME}`).hostname, "PRODUCTION_HOSTNAME must contain only a hostname.");
    assert.notEqual(staging.hostname, env.PRODUCTION_HOSTNAME, "Staging must not use the production hostname.");

    const database = new URL(env.DATABASE_URL ?? "");
    assert.equal(database.protocol, "postgresql:", "DATABASE_URL must use PostgreSQL.");
    assert(database.username && database.password && database.pathname.length > 1, "DATABASE_URL must include credentials and a database.");
    assert.notEqual(database.searchParams.get("sslmode"), "disable", "DATABASE_URL must use TLS.");
    assert.equal(database.hostname, env.DATABASE_TARGET_HOST, "DATABASE_TARGET_HOST must match DATABASE_URL.");
    assert(env.PRODUCTION_DATABASE_HOST, "PRODUCTION_DATABASE_HOST is required.");
    assert.notEqual(database.hostname, env.PRODUCTION_DATABASE_HOST, "Staging must not use the production database.");
    assert(env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length >= 32, "BETTER_AUTH_SECRET must contain at least 32 characters.");
    assert(env.DEMO_EMAIL?.includes("@"), "DEMO_EMAIL is required.");
    assert(env.DEMO_PASSWORD && env.DEMO_PASSWORD.length >= 12, "DEMO_PASSWORD must contain at least 12 characters.");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Invalid staging configuration.");
  }
  return errors;
}

function accessHeaders(env: Environment) {
  assert(env.CF_ACCESS_CLIENT_ID, "CF_ACCESS_CLIENT_ID is required.");
  assert(env.CF_ACCESS_CLIENT_SECRET, "CF_ACCESS_CLIENT_SECRET is required.");
  return {
    "CF-Access-Client-Id": env.CF_ACCESS_CLIENT_ID,
    "CF-Access-Client-Secret": env.CF_ACCESS_CLIENT_SECRET,
  };
}

export async function verifyAccess(env: Environment, fetcher = fetch) {
  const staging = origin(env.STAGING_URL, "STAGING_URL");
  const response = await fetcher(new URL("/login", staging), { redirect: "manual" });
  const location = response.headers.get("location") ?? "";
  let protectedByAccess = false;
  try {
    const redirect = new URL(location);
    protectedByAccess =
      response.status >= 300 &&
      response.status < 400 &&
      redirect.protocol === "https:" &&
      redirect.hostname.endsWith(".cloudflareaccess.com") &&
      redirect.pathname.startsWith("/cdn-cgi/access/login/");
  } catch {
    protectedByAccess = false;
  }
  assert(protectedByAccess, "Cloudflare Access did not block an unauthenticated staging request.");
}

export async function verifyStaging(env: Environment, fetcher = fetch) {
  const errors = stagingEnvironmentErrors(env);
  assert.equal(errors.length, 0, errors.join("\n"));
  await verifyAccess(env, fetcher);
  const staging = origin(env.STAGING_URL, "STAGING_URL");
  const headers = accessHeaders(env);
  const loginPage = await fetcher(new URL("/login", staging), { headers });
  assert.equal(loginPage.status, 200, "Authenticated Access request to /login failed.");
  assert((await loginPage.text()).includes("Completar cuenta de prueba"), "The staging demo button is not rendered.");

  const signIn = await fetcher(new URL("/api/auth/sign-in/email", staging), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Origin: staging.origin },
    body: JSON.stringify({ email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD }),
  });
  assert.equal(signIn.status, 200, "The staging demo account did not authenticate.");
  assert(signIn.headers.get("set-cookie"), "The staging login did not create a session.");
}

async function main(mode: string | undefined) {
  if (mode === "--preflight") {
    const errors = stagingEnvironmentErrors(process.env);
    if (errors.length) throw new Error(errors.join("\n"));
    console.log("Staging configuration is isolated and safe to deploy.");
    return;
  }
  if (mode === "--verify-access") {
    await verifyAccess(process.env);
    console.log("Cloudflare Access protects staging.");
    return;
  }
  if (mode === "--verify") {
    await verifyStaging(process.env);
    console.log("Protected staging demo login verified.");
    return;
  }
  throw new Error("Use --preflight, --verify-access, or --verify.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv[2]).catch((error) => {
    console.error(error instanceof Error ? error.message : "Staging deployment validation failed.");
    process.exitCode = 1;
  });
}
