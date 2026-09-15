import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError } from "@/lib/api";
const schema = z.object({ name: z.string().trim().min(1).max(240).optional(), description: z.string().trim().max(2000).nullable().optional(), category: z.string().trim().max(80).nullable().optional(), externalUrl: z.string().url().max(1000).nullable().optional() });
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  const document = await db.query.documents.findFirst({ where: and(eq(documents.id, (await params).id), eq(documents.organizationId, context.organization.id)), with: { process: true } });
  return document ? Response.json({ document }) : apiError("Documento no encontrado", 404);
  } catch (error) { return handleApiError(error); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const id = (await params).id; const data = schema.parse(await request.json());
    const where = and(eq(documents.id, id), eq(documents.organizationId, context.organization.id));
    const document = Object.values(data).some((value) => value !== undefined)
      ? (await db.update(documents).set({ ...data, updatedAt: new Date() }).where(where).returning())[0]
      : await db.query.documents.findFirst({ where });
    return document ? Response.json({ document }) : apiError("Documento no encontrado", 404);
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const context = await requireApiContext(["OWNER", "ADMIN"]); if (!context) return apiError("Se requiere rol administrador", 403);
  const result = await db.delete(documents).where(and(eq(documents.id, (await params).id), eq(documents.organizationId, context.organization.id))).returning({ id: documents.id });
  return result.length ? new Response(null, { status: 204 }) : apiError("Documento no encontrado", 404);
  } catch (error) { return handleApiError(error); }
}
