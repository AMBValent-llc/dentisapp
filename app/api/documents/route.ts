import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1).max(240),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(80).optional(),
  processId: z.string().optional(),
  mimeType: z.string().trim().max(100).optional(),
  sizeBytes: z.number().int().nonnegative().max(2_147_483_647).optional(),
  externalUrl: z.string().url().max(1000).optional(),
});
export async function GET() {
  const context = await requireApiContext();
  if (!context) return apiError("No autorizado", 401);
  const documents = await prisma.document.findMany({ where: { organizationId: context.organization.id }, include: { process: { select: { id: true, name: true } }, uploadedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } });
  return Response.json({ documents });
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext();
    if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (data.processId && !await prisma.process.findFirst({ where: { id: data.processId, organizationId: context.organization.id } })) return apiError("Proceso no válido", 422);
    const document = await prisma.document.create({ data: { ...data, organizationId: context.organization.id, uploadedById: context.session.user.id } });
    return Response.json({ document }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
