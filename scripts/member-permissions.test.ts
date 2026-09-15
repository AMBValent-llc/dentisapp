import assert from "node:assert/strict";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { processes } from "../lib/db/schema";
import { createMemberFixture } from "./test-fixtures";

test("MEMBER can read its workspace but cannot delete an administrative process", async () => {
  const { id, origin, cookie } = await createMemberFixture();
  await db.insert(processes).values({ id, organizationId: id, name: "Protected process" });
  const read = await fetch(new URL("/api/processes", origin), { headers: { cookie }, redirect: "manual" });
  assert.equal(read.status, 200);
  const deletion = await fetch(new URL(`/api/processes/${id}`, origin), {
    method: "DELETE",
    headers: { cookie, origin: origin.origin },
    redirect: "manual",
  });
  assert.equal(deletion.status, 403);
  assert.ok(await db.query.processes.findFirst({ where: eq(processes.id, id) }), "Forbidden deletion must leave the process intact.");
});
