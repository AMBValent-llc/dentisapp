import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError } from "@/lib/api";
import type { Prisma } from "@/generated/prisma/client";
const schema = z.object({ patientId: z.string().min(1), consultationReason: z.string().trim().min(2).max(3000), currentIllness: z.string().trim().max(5000).optional(), personalHistory: z.string().trim().max(5000).optional(), familyHistory: z.string().trim().max(5000).optional(), currentMedication: z.string().trim().max(3000).optional(), examination: z.string().trim().max(5000).optional(), diagnosis: z.string().trim().max(5000).optional(), treatmentPlan: z.string().trim().max(5000).optional(), painScale: z.number().int().min(0).max(10).optional(), metadata: z.record(z.string(), z.unknown()).optional() });
export async function GET(request: Request) {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  const patientId = new URL(request.url).searchParams.get("patientId") ?? undefined;
  const histories = await prisma.clinicalHistory.findMany({ where: { organizationId: context.organization.id, patientId }, include: { patient: { select: { id: true, fullName: true, documentNumber: true } }, author: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } });
  return Response.json({ histories });
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (!await prisma.patient.findFirst({ where: { id: data.patientId, organizationId: context.organization.id } })) return apiError("Paciente no válido", 422);
    const history = await prisma.clinicalHistory.create({ data: { ...data, metadata: data.metadata as Prisma.InputJsonValue | undefined, organizationId: context.organization.id, authorId: context.session.user.id } });
    return Response.json({ history }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
