import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";

const schema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(3000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiContext();
  if (!context) return apiError("No autorizado", 401);
  const task = await prisma.task.findFirst({ where: { id: (await params).id, organizationId: context.organization.id }, include: { process: true, assignee: { select: { id: true, name: true } } } });
  return task ? Response.json({ task }) : apiError("Tarea no encontrada", 404);
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext();
    if (!context) return apiError("No autorizado", 401);
    const id = (await params).id; const data = schema.parse(await request.json());
    if (!await prisma.task.findFirst({ where: { id, organizationId: context.organization.id } })) return apiError("Tarea no encontrada", 404);
    const task = await prisma.task.update({ where: { id }, data: { ...data, dueDate: data.dueDate === null ? null : parseDate(data.dueDate) } });
    return Response.json({ task });
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiContext(["OWNER", "ADMIN"]);
  if (!context) return apiError("Se requiere rol administrador", 403);
  const result = await prisma.task.deleteMany({ where: { id: (await params).id, organizationId: context.organization.id } });
  return result.count ? new Response(null, { status: 204 }) : apiError("Tarea no encontrada", 404);
}
