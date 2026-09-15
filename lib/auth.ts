import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/lib/db";
import { accounts, sessions, users, verifications } from "@/lib/db/schema";

type AuthDatabase = BetterAuthOptions["database"];

type CreateAuthOptions = {
  configuredURL?: string;
  database?: AuthDatabase;
  production?: boolean;
  request?: Request | Headers;
  secret?: string;
};

function getLoopbackOrigin(request?: Request | Headers) {
  if (!request) return undefined;
  const url = request instanceof Request
    ? new URL(request.url)
    : new URL(`http://${request.get("host") ?? "invalid"}`);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return undefined;
  return url.origin;
}

function getProductionOrigin(configuredURL?: string) {
  if (!configuredURL) throw new Error("BETTER_AUTH_URL is required in production.");
  const url = new URL(configuredURL);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("BETTER_AUTH_URL must be an HTTPS origin in production.");
  }
  return url.origin;
}

export function createAuth({
  configuredURL,
  database,
  production = process.env.NODE_ENV === "production",
  request,
  secret = process.env.BETTER_AUTH_SECRET,
}: CreateAuthOptions) {
  const baseURL = production
    ? getProductionOrigin(configuredURL ?? process.env.BETTER_AUTH_URL)
    : getLoopbackOrigin(request) ?? configuredURL ?? process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return betterAuth({
    appName: "Docli",
    baseURL,
    secret,
    database,
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    trustedOrigins: baseURL ? [new URL(baseURL).origin] : undefined,
  });
}

const authByOrigin = new Map<string, ReturnType<typeof createAuth>>();

export function getAuth(request?: Request | Headers) {
  const production = process.env.NODE_ENV === "production";
  const origin = production
    ? getProductionOrigin(process.env.BETTER_AUTH_URL)
    : getLoopbackOrigin(request) ?? process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "development";
  const existing = authByOrigin.get(origin);
  if (existing) return existing;
  const created = createAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
      transaction: false,
    }),
    production,
    request,
  });
  authByOrigin.set(origin, created);
  return created;
}
