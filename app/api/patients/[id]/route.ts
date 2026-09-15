import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clinicalHistories, patients } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ fullName: z.string().trim().min(2).max(160).optional(), birthDate: z.string().date().nullable().optional(), sex: z.string().trim().max(30).nullable().optional(), phone: z.string().trim().max(40).nullable().optional(), email: z.string().email().max(200).nullable().optional(), address: z.string().trim().max(300).nullable().optional(), city: z.string().trim().max(100).nullable().optional() });
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  const patient = await db.query.patients.findFirst({ where: and(eq(patients.id, (await params).id), eq(patients.organizationId, context.organization.id)), with: { histories: { orderBy: desc(clinicalHistories.createdAt) }, consents: true, referrals: true, exams: true } });
  return patient ? Response.json({ patient }) : apiError("Paciente no encontrado", 404);
  } catch (error) { return handleApiError(error); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const id = (await params).id; const data = schema.parse(await request.json());
    const where = and(eq(patients.id, id), eq(patients.organizationId, context.organization.id));
    const patient = Object.values(data).some((value) => value !== undefined)
      ? (await db.update(patients).set({ ...data, birthDate: data.birthDate === null ? null : parseDate(data.birthDate), updatedAt: new Date() }).where(where).returning())[0]
      : await db.query.patients.findFirst({ where });
    return patient ? Response.json({ patient }) : apiError("Paciente no encontrado", 404);
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const context = await requireApiContext(["OWNER", "ADMIN"]); if (!context) return apiError("Se requiere rol administrador", 403);
  const result = await db.delete(patients).where(and(eq(patients.id, (await params).id), eq(patients.organizationId, context.organization.id))).returning({ id: patients.id });
  return result.length ? new Response(null, { status: 204 }) : apiError("Paciente no encontrado", 404);
  } catch (error) { return handleApiError(error); }
}
