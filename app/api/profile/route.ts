import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError } from "@/lib/api";
const schema = z.object({ name: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(40).nullable().optional(), organizationName: z.string().trim().min(2).max(120).optional(), sector: z.string().trim().max(80).nullable().optional(), timezone: z.string().trim().min(1).max(80).optional() });
export async function GET() {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  const user = await prisma.user.findUnique({ where: { id: context.session.user.id }, select: { id: true, name: true, email: true, phone: true } });
  return Response.json({ user, organization: context.organization, role: context.membership.role });
}
export async function PATCH(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    const [user, organization] = await prisma.$transaction([
      prisma.user.update({ where: { id: context.session.user.id }, data: { name: data.name, phone: data.phone } }),
      prisma.organization.update({ where: { id: context.organization.id }, data: { name: data.organizationName, sector: data.sector, timezone: data.timezone } }),
    ]);
    return Response.json({ user, organization });
  } catch (error) { return handleApiError(error); }
}
