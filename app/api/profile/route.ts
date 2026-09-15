import { z } from "zod";
import { and, eq, exists, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, users } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError } from "@/lib/api";
const schema = z.object({ name: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(40).nullable().optional(), organizationName: z.string().trim().min(2).max(120).optional(), sector: z.string().trim().max(80).nullable().optional(), timezone: z.string().trim().min(1).max(80).optional() });
export async function GET() {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const user = await db.query.users.findFirst({ where: eq(users.id, context.session.user.id), columns: { id: true, name: true, email: true, phone: true } });
    return Response.json({ user: user ?? null, organization: context.organization, role: context.membership.role });
  } catch (error) { return handleApiError(error); }
}
export async function PATCH(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    const userChanged = data.name !== undefined || data.phone !== undefined;
    const organizationChanged = data.organizationName !== undefined || data.sector !== undefined || data.timezone !== undefined;
    // Lock both targets before writing so a concurrent deletion cannot leave a partial profile update.
    const organizationExists = exists(db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, context.organization.id)).for("update"));
    const userExists = exists(db.select({ id: users.id }).from(users).where(eq(users.id, context.session.user.id)));
    // Self-assignment keeps empty updates valid without advancing their timestamps.
    const [[user], [organization]] = await db.batch([
      db.update(users).set({ name: data.name, phone: data.phone, updatedAt: userChanged ? new Date() : sql`${users.updatedAt}` }).where(and(eq(users.id, context.session.user.id), organizationExists)).returning(),
      db.update(organizations).set({ name: data.organizationName, sector: data.sector, timezone: data.timezone, updatedAt: organizationChanged ? new Date() : sql`${organizations.updatedAt}` }).where(and(eq(organizations.id, context.organization.id), userExists)).returning(),
    ]);
    if (!user || !organization) throw new Error("Profile update returned no row");
    return Response.json({ user, organization });
  } catch (error) { return handleApiError(error); }
}
