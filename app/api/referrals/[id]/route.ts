import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { referrals } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ specialty: z.string().trim().min(2).max(160).optional(), provider: z.string().trim().max(160).nullable().optional(), reason: z.string().trim().min(2).max(3000).optional(), status: z.enum(["DRAFT", "SENT", "ACCEPTED", "COMPLETED", "CANCELLED"]).optional(), referredAt: z.string().datetime().nullable().optional(), notes: z.string().trim().max(3000).nullable().optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const id = (await params).id; const data = schema.parse(await request.json());
    const where = and(eq(referrals.id, id), eq(referrals.organizationId, context.organization.id));
    const referral = Object.values(data).some((value) => value !== undefined)
      ? (await db.update(referrals).set({ ...data, referredAt: data.referredAt === null ? null : parseDate(data.referredAt), updatedAt: new Date() }).where(where).returning())[0]
      : await db.query.referrals.findFirst({ where });
    return referral ? Response.json({ referral }) : apiError("Remisión no encontrada", 404);
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(["OWNER", "ADMIN"]); if (!context) return apiError("Se requiere rol administrador", 403);
    const result = await db.delete(referrals).where(and(eq(referrals.id, (await params).id), eq(referrals.organizationId, context.organization.id))).returning({ id: referrals.id });
    return result.length ? new Response(null, { status: 204 }) : apiError("Remisión no encontrada", 404);
  } catch (error) { return handleApiError(error); }
}
