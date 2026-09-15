import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exams } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ name: z.string().trim().min(2).max(200).optional(), type: z.string().trim().max(120).nullable().optional(), status: z.enum(["ORDERED", "SCHEDULED", "COMPLETED", "CANCELLED"]).optional(), scheduledAt: z.string().datetime().nullable().optional(), completedAt: z.string().datetime().nullable().optional(), result: z.string().trim().max(5000).nullable().optional(), notes: z.string().trim().max(3000).nullable().optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const id = (await params).id; const data = schema.parse(await request.json());
    const where = and(eq(exams.id, id), eq(exams.organizationId, context.organization.id));
    const exam = Object.values(data).some((value) => value !== undefined)
      ? (await db.update(exams).set({ ...data, scheduledAt: data.scheduledAt === null ? null : parseDate(data.scheduledAt), completedAt: data.completedAt === null ? null : parseDate(data.completedAt), updatedAt: new Date() }).where(where).returning())[0]
      : await db.query.exams.findFirst({ where });
    return exam ? Response.json({ exam }) : apiError("Examen no encontrado", 404);
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(["OWNER", "ADMIN"]); if (!context) return apiError("Se requiere rol administrador", 403);
    const result = await db.delete(exams).where(and(eq(exams.id, (await params).id), eq(exams.organizationId, context.organization.id))).returning({ id: exams.id });
    return result.length ? new Response(null, { status: 204 }) : apiError("Examen no encontrado", 404);
  } catch (error) { return handleApiError(error); }
}
