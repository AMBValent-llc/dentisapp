import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";

const schema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(3000).optional(),
  processId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function GET(request: Request) {
  const context = await requireApiContext();
  if (!context) return apiError("No autorizado", 401);
  const q = new URL(request.url).searchParams.get("q")?.trim();
  const tasks = await prisma.task.findMany({
    where: { organizationId: context.organization.id, ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
    include: { process: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
  return Response.json({ tasks });
}

export async function POST(request: Request) {
  try {
    const context = await requireApiContext();
    if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (data.processId && !await prisma.process.findFirst({ where: { id: data.processId, organizationId: context.organization.id } })) return apiError("Proceso no válido", 422);
    if (data.assigneeId && !await prisma.membership.findUnique({ where: { userId_organizationId: { userId: data.assigneeId, organizationId: context.organization.id } } })) return apiError("Responsable no pertenece al equipo", 422);
    const task = await prisma.task.create({ data: { ...data, dueDate: parseDate(data.dueDate), organizationId: context.organization.id, createdById: context.session.user.id } });
    return Response.json({ task }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
