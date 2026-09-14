import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ patientId: z.string().min(1), name: z.string().trim().min(2).max(200), type: z.string().trim().max(120).optional(), status: z.enum(["ORDERED", "SCHEDULED", "COMPLETED", "CANCELLED"]).optional(), scheduledAt: z.string().datetime().nullable().optional(), completedAt: z.string().datetime().nullable().optional(), result: z.string().trim().max(5000).optional(), notes: z.string().trim().max(3000).optional() });
export async function GET() {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  return Response.json({ exams: await prisma.exam.findMany({ where: { organizationId: context.organization.id }, include: { patient: { select: { id: true, fullName: true, documentNumber: true } } }, orderBy: { createdAt: "desc" } }) });
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (!await prisma.patient.findFirst({ where: { id: data.patientId, organizationId: context.organization.id } })) return apiError("Paciente no válido", 422);
    const exam = await prisma.exam.create({ data: { ...data, scheduledAt: parseDate(data.scheduledAt), completedAt: parseDate(data.completedAt), organizationId: context.organization.id, createdById: context.session.user.id } });
    return Response.json({ exam }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
