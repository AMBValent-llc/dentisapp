import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ documentNumber: z.string().trim().min(3).max(50), fullName: z.string().trim().min(2).max(160), birthDate: z.string().date().nullable().optional(), sex: z.string().trim().max(30).optional(), phone: z.string().trim().max(40).optional(), email: z.string().email().max(200).optional(), address: z.string().trim().max(300).optional(), city: z.string().trim().max(100).optional() });
export async function GET(request: Request) {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  const q = new URL(request.url).searchParams.get("q")?.trim();
  const patients = await prisma.patient.findMany({ where: { organizationId: context.organization.id, ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { documentNumber: { contains: q } }] } : {}) }, include: { _count: { select: { histories: true, consents: true, referrals: true, exams: true } } }, orderBy: { fullName: "asc" } });
  return Response.json({ patients });
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (await prisma.patient.findUnique({ where: { organizationId_documentNumber: { organizationId: context.organization.id, documentNumber: data.documentNumber } } })) return apiError("Ya existe un paciente con este documento", 409);
    const patient = await prisma.patient.create({ data: { ...data, birthDate: parseDate(data.birthDate), organizationId: context.organization.id } });
    return Response.json({ patient }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
