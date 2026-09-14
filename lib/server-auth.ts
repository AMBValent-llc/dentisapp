import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/generated/prisma/client";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requirePageContext() {
  const session = await getSession();
  if (!session) redirect("/login");
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) redirect("/registro?workspace=required");
  return { session, membership, organization: membership.organization };
}

export async function requireApiContext(roles?: MembershipRole[]) {
  const session = await getSession();
  if (!session) return null;
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership || (roles && !roles.includes(membership.role))) return null;
  return { session, membership, organization: membership.organization };
}
