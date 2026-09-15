import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, processes } from "@/lib/db/schema";
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
  try {
  const context = await requireApiContext();
  if (!context) return apiError("No autorizado", 401);
  const rows = await db.query.documents.findMany({ where: eq(documents.organizationId, context.organization.id), with: { process: { columns: { id: true, name: true } }, uploadedBy: { columns: { id: true, name: true } } }, orderBy: desc(documents.createdAt) });
  return Response.json({ documents: rows });
  } catch (error) { return handleApiError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext();
    if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (data.processId && !await db.query.processes.findFirst({ where: and(eq(processes.id, data.processId), eq(processes.organizationId, context.organization.id)) })) return apiError("Proceso no válido", 422);
    const [document] = await db.insert(documents).values({ ...data, id: crypto.randomUUID(), organizationId: context.organization.id, uploadedById: context.session.user.id }).returning();
    if (!document) throw new Error("Document creation returned no row");
    return Response.json({ document }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
