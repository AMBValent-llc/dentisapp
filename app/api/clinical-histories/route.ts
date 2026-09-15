import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clinicalHistories, patients } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError } from "@/lib/api";
const schema = z.object({ patientId: z.string().min(1), consultationReason: z.string().trim().min(2).max(3000), currentIllness: z.string().trim().max(5000).optional(), personalHistory: z.string().trim().max(5000).optional(), familyHistory: z.string().trim().max(5000).optional(), currentMedication: z.string().trim().max(3000).optional(), examination: z.string().trim().max(5000).optional(), diagnosis: z.string().trim().max(5000).optional(), treatmentPlan: z.string().trim().max(5000).optional(), painScale: z.number().int().min(0).max(10).optional(), metadata: z.record(z.string(), z.unknown()).optional() });
export async function GET(request: Request) {
  try {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  const patientId = new URL(request.url).searchParams.get("patientId") ?? undefined;
  const histories = await db.query.clinicalHistories.findMany({ where: and(eq(clinicalHistories.organizationId, context.organization.id), patientId !== undefined ? eq(clinicalHistories.patientId, patientId) : undefined), with: { patient: { columns: { id: true, fullName: true, documentNumber: true } }, author: { columns: { id: true, name: true } } }, orderBy: desc(clinicalHistories.createdAt) });
  return Response.json({ histories });
  } catch (error) { return handleApiError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (!await db.query.patients.findFirst({ where: and(eq(patients.id, data.patientId), eq(patients.organizationId, context.organization.id)) })) return apiError("Paciente no válido", 422);
    const [history] = await db.insert(clinicalHistories).values({ ...data, id: crypto.randomUUID(), organizationId: context.organization.id, authorId: context.session.user.id }).returning();
    if (!history) throw new Error("Clinical history creation returned no row");
    return Response.json({ history }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
