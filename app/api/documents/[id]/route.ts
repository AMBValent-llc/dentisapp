import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError } from "@/lib/api";
const schema = z.object({ name: z.string().trim().min(1).max(240).optional(), description: z.string().trim().max(2000).nullable().optional(), category: z.string().trim().max(80).nullable().optional(), externalUrl: z.string().url().max(1000).nullable().optional() });
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  const document = await prisma.document.findFirst({ where: { id: (await params).id, organizationId: context.organization.id }, include: { process: true } });
  return document ? Response.json({ document }) : apiError("Documento no encontrado", 404);
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const id = (await params).id; const data = schema.parse(await request.json());
    if (!await prisma.document.findFirst({ where: { id, organizationId: context.organization.id } })) return apiError("Documento no encontrado", 404);
    return Response.json({ document: await prisma.document.update({ where: { id }, data }) });
  } catch (error) { return handleApiError(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiContext(["OWNER", "ADMIN"]); if (!context) return apiError("Se requiere rol administrador", 403);
  const result = await prisma.document.deleteMany({ where: { id: (await params).id, organizationId: context.organization.id } });
  return result.count ? new Response(null, { status: 204 }) : apiError("Documento no encontrado", 404);
}
