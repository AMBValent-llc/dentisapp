import { z } from "zod";
import { prisma } from "@/lib/prisma";
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
  const context = await requireApiContext();
  if (!context) return apiError("No autorizado", 401);
  const query = new URL(request.url).searchParams.get("q")?.trim();
  const processes = await prisma.process.findMany({
    where: {
      organizationId: context.organization.id,
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] } : {}),
    },
    include: { steps: { orderBy: { position: "asc" } }, _count: { select: { tasks: true, documents: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json({ processes });
}

export async function POST(request: Request) {
  try {
    const context = await requireApiContext();
    if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    const { steps, dueDate, ...fields } = data;
    const process = await prisma.process.create({
      data: {
        ...fields,
        dueDate: parseDate(dueDate),
        organizationId: context.organization.id,
        steps: steps ? { create: steps.map((title, position) => ({ title, position })) } : undefined,
      },
      include: { steps: { orderBy: { position: "asc" } } },
    });
    return Response.json({ process }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
