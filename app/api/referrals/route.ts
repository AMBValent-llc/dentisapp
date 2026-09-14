import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ patientId: z.string().min(1), specialty: z.string().trim().min(2).max(160), provider: z.string().trim().max(160).optional(), reason: z.string().trim().min(2).max(3000), status: z.enum(["DRAFT", "SENT", "ACCEPTED", "COMPLETED", "CANCELLED"]).optional(), referredAt: z.string().datetime().nullable().optional(), notes: z.string().trim().max(3000).optional() });
export async function GET() {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  return Response.json({ referrals: await prisma.referral.findMany({ where: { organizationId: context.organization.id }, include: { patient: { select: { id: true, fullName: true, documentNumber: true } } }, orderBy: { createdAt: "desc" } }) });
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (!await prisma.patient.findFirst({ where: { id: data.patientId, organizationId: context.organization.id } })) return apiError("Paciente no válido", 422);
    const referral = await prisma.referral.create({ data: { ...data, referredAt: parseDate(data.referredAt), organizationId: context.organization.id, createdById: context.session.user.id } });
    return Response.json({ referral }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
