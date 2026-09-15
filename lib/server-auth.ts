import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, type MembershipRole } from "@/lib/db/schema";

export async function getSession() {
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}

export async function requirePageContext() {
  const session = await getSession();
  if (!session) redirect("/login");
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
    with: { organization: true },
    orderBy: asc(memberships.createdAt),
  });
  if (!membership) redirect("/registro?workspace=required");
  return { session, membership, organization: membership.organization };
}

export async function requireApiContext(roles?: MembershipRole[]) {
  const session = await getSession();
  if (!session) return null;
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
    with: { organization: true },
    orderBy: asc(memberships.createdAt),
  });
  if (!membership || (roles && !roles.includes(membership.role))) return null;
  return { session, membership, organization: membership.organization };
}
