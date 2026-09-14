import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ fullName: z.string().trim().min(2).max(160).optional(), birthDate: z.string().date().nullable().optional(), sex: z.string().trim().max(30).nullable().optional(), phone: z.string().trim().max(40).nullable().optional(), email: z.string().email().max(200).nullable().optional(), address: z.string().trim().max(300).nullable().optional(), city: z.string().trim().max(100).nullable().optional() });
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  const patient = await prisma.patient.findFirst({ where: { id: (await params).id, organizationId: context.organization.id }, include: { histories: { orderBy: { createdAt: "desc" } }, consents: true, referrals: true, exams: true } });
  return patient ? Response.json({ patient }) : apiError("Paciente no encontrado", 404);
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const id = (await params).id; const data = schema.parse(await request.json());
    if (!await prisma.patient.findFirst({ where: { id, organizationId: context.organization.id } })) return apiError("Paciente no encontrado", 404);
    return Response.json({ patient: await prisma.patient.update({ where: { id }, data: { ...data, birthDate: data.birthDate === null ? null : parseDate(data.birthDate) } }) });
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiContext(["OWNER", "ADMIN"]); if (!context) return apiError("Se requiere rol administrador", 403);
  const result = await prisma.patient.deleteMany({ where: { id: (await params).id, organizationId: context.organization.id } });
  return result.count ? new Response(null, { status: 204 }) : apiError("Paciente no encontrado", 404);
}
