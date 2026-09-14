import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(3000).nullable().optional(),
  area: z.string().trim().max(100).nullable().optional(),
  ownerName: z.string().trim().max(120).nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiContext();
  if (!context) return apiError("No autorizado", 401);
  const { id } = await params;
  const process = await prisma.process.findFirst({ where: { id, organizationId: context.organization.id }, include: { steps: { orderBy: { position: "asc" } }, tasks: true, documents: true } });
  if (!process) return apiError("Proceso no encontrado", 404);
  return Response.json({ process });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext();
    if (!context) return apiError("No autorizado", 401);
    const { id } = await params;
    const data = patchSchema.parse(await request.json());
    const exists = await prisma.process.findFirst({ where: { id, organizationId: context.organization.id }, select: { id: true } });
    if (!exists) return apiError("Proceso no encontrado", 404);
    const process = await prisma.process.update({ where: { id }, data: { ...data, dueDate: data.dueDate === null ? null : parseDate(data.dueDate) } });
    return Response.json({ process });
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiContext(["OWNER", "ADMIN"]);
  if (!context) return apiError("Se requiere rol administrador", 403);
  const { id } = await params;
  const result = await prisma.process.deleteMany({ where: { id, organizationId: context.organization.id } });
  if (!result.count) return apiError("Proceso no encontrado", 404);
  return new Response(null, { status: 204 });
}
