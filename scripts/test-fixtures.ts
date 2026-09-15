import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../lib/db";
import { memberships, organizations, users } from "../lib/db/schema";

export async function createMemberFixture() {
  loadEnvConfig(process.cwd());
  assert.equal(process.env.ALLOW_DATABASE_TESTS, "1", "This test requires an isolated database.");
  assert.equal(process.env.ALLOW_API_TESTS, "1", "This test creates synthetic API and database records.");
  assert.ok(process.env.DATABASE_URL);
  assert.ok(process.env.TEST_DATABASE_HOST);
  assert.equal(new URL(process.env.DATABASE_URL).hostname, process.env.TEST_DATABASE_HOST);
  assert.ok(process.env.NEXT_PUBLIC_APP_URL, "Provide the local server connected to that database.");
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname), "Only a local validation server is allowed.");

  const id = randomUUID();
  const email = `member-${id}@example.invalid`;
  const password = `Test-${randomUUID()}!`;
  const signup = await fetch(new URL("/api/auth/sign-up/email", origin), {
    method: "POST",
    headers: { "content-type": "application/json", origin: origin.origin },
    body: JSON.stringify({ name: "Member validation", email, password }),
  });
  assert.equal(signup.status, 200, `Signup failed with status ${signup.status}`);
  const body = z.object({ user: z.object({ id: z.string() }) }).parse(await signup.json());
  const cookie = signup.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  assert.ok(cookie);
  const user = await db.query.users.findFirst({ where: eq(users.id, body.user.id) });
  assert.equal(user?.email, email, "API server and fixture database must be the same isolated target.");
  await db.batch([
    db.insert(organizations).values({ id, name: "Member permissions validation", slug: `member-${id}` }),
    db.insert(memberships).values({ organizationId: id, userId: body.user.id, role: "MEMBER" }),
  ]);
  return { id, origin, email, password, cookie };
}
