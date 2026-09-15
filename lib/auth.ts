import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/lib/db";
import { accounts, sessions, users, verifications } from "@/lib/db/schema";

function createAuth() {
  const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;

  return betterAuth({
    appName: "Docli",
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
      transaction: false,
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    trustedOrigins: baseURL ? [new URL(baseURL).origin] : [],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return auth ??= createAuth();
}
