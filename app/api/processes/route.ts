import { z } from "zod";
import { and, asc, desc, eq, getTableName, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { processes, processSteps } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(3000).optional(),
  area: z.string().trim().max(100).optional(),
  ownerName: z.string().trim().max(120).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  steps: z.array(z.string().trim().min(1).max(300)).max(50).optional(),
});

export async function GET(request: Request) {
  try {
    const context = await requireApiContext();
    if (!context) return apiError("No autorizado", 401);
    const query = new URL(request.url).searchParams.get("q")?.trim();
    const pattern = query ? `%${query.replace(/[\\%_]/g, "\\$&")}%` : undefined;
    const rows = await db.query.processes.findMany({
      where: and(eq(processes.organizationId, context.organization.id), pattern ? or(ilike(processes.name, pattern), ilike(processes.description, pattern)) : undefined),
      with: { steps: { orderBy: asc(processSteps.position) } },
      extras: (table) => {
        const processId = sql`${sql.identifier(getTableName(table.id.table))}.${sql.identifier(table.id.name)}`;
        return {
          taskCount: sql<number>`(select count(*)::int from "Task" where "Task"."processId" = ${processId})`.as("task_count"),
          documentCount: sql<number>`(select count(*)::int from "Document" where "Document"."processId" = ${processId})`.as("document_count"),
        };
      },
      orderBy: desc(processes.updatedAt),
    });
    return Response.json({ processes: rows.map(({ taskCount, documentCount, ...process }) => ({ ...process, _count: { tasks: taskCount, documents: documentCount } })) });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await requireApiContext();
    if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    const { steps, dueDate, ...fields } = data;
    const id = crypto.randomUUID();
    const insertProcess = db.insert(processes).values({ ...fields, id, dueDate: parseDate(dueDate), organizationId: context.organization.id }).returning();
    if (steps?.length) {
      const [[process], createdSteps] = await db.batch([
        insertProcess,
        db.insert(processSteps).values(steps.map((title, position) => ({ id: crypto.randomUUID(), processId: id, title, position }))).returning(),
      ]);
      if (!process) throw new Error("Process creation returned no row");
      return Response.json({ process: { ...process, steps: createdSteps.sort((a, b) => a.position - b.position) } }, { status: 201 });
    }
    const [process] = await insertProcess;
    if (!process) throw new Error("Process creation returned no row");
    return Response.json({ process: { ...process, steps: [] } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
