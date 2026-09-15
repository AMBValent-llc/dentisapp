import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { exams, patients } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ patientId: z.string().min(1), name: z.string().trim().min(2).max(200), type: z.string().trim().max(120).optional(), status: z.enum(["ORDERED", "SCHEDULED", "COMPLETED", "CANCELLED"]).optional(), scheduledAt: z.string().datetime().nullable().optional(), completedAt: z.string().datetime().nullable().optional(), result: z.string().trim().max(5000).optional(), notes: z.string().trim().max(3000).optional() });
export async function GET() {
  try {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  return Response.json({ exams: await db.query.exams.findMany({ where: eq(exams.organizationId, context.organization.id), with: { patient: { columns: { id: true, fullName: true, documentNumber: true } } }, orderBy: desc(exams.createdAt) }) });
  } catch (error) { return handleApiError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (!await db.query.patients.findFirst({ where: and(eq(patients.id, data.patientId), eq(patients.organizationId, context.organization.id)) })) return apiError("Paciente no válido", 422);
    const [exam] = await db.insert(exams).values({ ...data, id: crypto.randomUUID(), scheduledAt: parseDate(data.scheduledAt), completedAt: parseDate(data.completedAt), organizationId: context.organization.id, createdById: context.session.user.id }).returning();
    if (!exam) throw new Error("Exam creation returned no row");
    return Response.json({ exam }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
