import { z } from "zod";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, processes, tasks } from "@/lib/db/schema";
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
  try {
  const context = await requireApiContext();
  if (!context) return apiError("No autorizado", 401);
  const q = new URL(request.url).searchParams.get("q")?.trim();
  const rows = await db.query.tasks.findMany({
    where: and(eq(tasks.organizationId, context.organization.id), q ? ilike(tasks.title, `%${q.replace(/[\\%_]/g, "\\$&")}%`) : undefined),
    with: { process: { columns: { id: true, name: true } }, assignee: { columns: { id: true, name: true } } },
    orderBy: [asc(tasks.status), asc(tasks.dueDate), desc(tasks.createdAt)],
  });
  return Response.json({ tasks: rows });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiContext();
    if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (data.processId && !await db.query.processes.findFirst({ where: and(eq(processes.id, data.processId), eq(processes.organizationId, context.organization.id)) })) return apiError("Proceso no válido", 422);
    if (data.assigneeId && !await db.query.memberships.findFirst({ where: and(eq(memberships.userId, data.assigneeId), eq(memberships.organizationId, context.organization.id)) })) return apiError("Responsable no pertenece al equipo", 422);
    const [task] = await db.insert(tasks).values({ ...data, id: crypto.randomUUID(), dueDate: parseDate(data.dueDate), organizationId: context.organization.id, createdById: context.session.user.id }).returning();
    if (!task) throw new Error("Task creation returned no row");
    return Response.json({ task }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
