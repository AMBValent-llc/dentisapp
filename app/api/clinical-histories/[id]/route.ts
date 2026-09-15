import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clinicalHistories } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError } from "@/lib/api";
const schema = z.object({ consultationReason: z.string().trim().min(2).max(3000).optional(), currentIllness: z.string().trim().max(5000).nullable().optional(), diagnosis: z.string().trim().max(5000).nullable().optional(), treatmentPlan: z.string().trim().max(5000).nullable().optional(), painScale: z.number().int().min(0).max(10).nullable().optional() });
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const history = await db.query.clinicalHistories.findFirst({ where: and(eq(clinicalHistories.id, (await params).id), eq(clinicalHistories.organizationId, context.organization.id)), with: { patient: true, author: { columns: { id: true, name: true } } } });
    return history ? Response.json({ history }) : apiError("Historia no encontrada", 404);
  } catch (error) { return handleApiError(error); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const id = (await params).id; const data = schema.parse(await request.json());
    const where = and(eq(clinicalHistories.id, id), eq(clinicalHistories.organizationId, context.organization.id));
    const history = Object.values(data).some((value) => value !== undefined)
      ? (await db.update(clinicalHistories).set({ ...data, updatedAt: new Date() }).where(where).returning())[0]
      : await db.query.clinicalHistories.findFirst({ where });
    return history ? Response.json({ history }) : apiError("Historia no encontrada", 404);
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(["OWNER", "ADMIN"]); if (!context) return apiError("Se requiere rol administrador", 403);
    const result = await db.delete(clinicalHistories).where(and(eq(clinicalHistories.id, (await params).id), eq(clinicalHistories.organizationId, context.organization.id))).returning({ id: clinicalHistories.id });
    return result.length ? new Response(null, { status: 204 }) : apiError("Historia no encontrada", 404);
  } catch (error) { return handleApiError(error); }
}
