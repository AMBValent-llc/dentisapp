import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { consents } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ title: z.string().trim().min(2).max(200).optional(), body: z.string().trim().max(10000).nullable().optional(), status: z.enum(["DRAFT", "PENDING", "SIGNED", "REVOKED"]).optional(), signedAt: z.string().datetime().nullable().optional(), expiresAt: z.string().datetime().nullable().optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const id = (await params).id; const data = schema.parse(await request.json());
    const where = and(eq(consents.id, id), eq(consents.organizationId, context.organization.id));
    const consent = Object.values(data).some((value) => value !== undefined)
      ? (await db.update(consents).set({ ...data, signedAt: data.signedAt === null ? null : parseDate(data.signedAt), expiresAt: data.expiresAt === null ? null : parseDate(data.expiresAt), updatedAt: new Date() }).where(where).returning())[0]
      : await db.query.consents.findFirst({ where });
    return consent ? Response.json({ consent }) : apiError("Consentimiento no encontrado", 404);
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(["OWNER", "ADMIN"]); if (!context) return apiError("Se requiere rol administrador", 403);
    const result = await db.delete(consents).where(and(eq(consents.id, (await params).id), eq(consents.organizationId, context.organization.id))).returning({ id: consents.id });
    return result.length ? new Response(null, { status: 204 }) : apiError("Consentimiento no encontrado", 404);
  } catch (error) { return handleApiError(error); }
}
