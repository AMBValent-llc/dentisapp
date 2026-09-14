import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ patientId: z.string().min(1), title: z.string().trim().min(2).max(200), body: z.string().trim().max(10000).optional(), status: z.enum(["DRAFT", "PENDING", "SIGNED", "REVOKED"]).optional(), signedAt: z.string().datetime().nullable().optional(), expiresAt: z.string().datetime().nullable().optional() });
export async function GET() {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  return Response.json({ consents: await prisma.consent.findMany({ where: { organizationId: context.organization.id }, include: { patient: { select: { id: true, fullName: true, documentNumber: true } } }, orderBy: { createdAt: "desc" } }) });
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (!await prisma.patient.findFirst({ where: { id: data.patientId, organizationId: context.organization.id } })) return apiError("Paciente no válido", 422);
    const consent = await prisma.consent.create({ data: { ...data, signedAt: parseDate(data.signedAt), expiresAt: parseDate(data.expiresAt), organizationId: context.organization.id, createdById: context.session.user.id } });
    return Response.json({ consent }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
