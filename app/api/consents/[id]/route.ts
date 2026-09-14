import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ title: z.string().trim().min(2).max(200).optional(), body: z.string().trim().max(10000).nullable().optional(), status: z.enum(["DRAFT", "PENDING", "SIGNED", "REVOKED"]).optional(), signedAt: z.string().datetime().nullable().optional(), expiresAt: z.string().datetime().nullable().optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401); const id = (await params).id; const data = schema.parse(await request.json()); if (!await prisma.consent.findFirst({ where: { id, organizationId: context.organization.id } })) return apiError("Consentimiento no encontrado", 404); return Response.json({ consent: await prisma.consent.update({ where: { id }, data: { ...data, signedAt: data.signedAt === null ? null : parseDate(data.signedAt), expiresAt: data.expiresAt === null ? null : parseDate(data.expiresAt) } }) }); } catch (error) { return handleApiError(error); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { const context = await requireApiContext(["OWNER", "ADMIN"]); if (!context) return apiError("Se requiere rol administrador", 403); const result = await prisma.consent.deleteMany({ where: { id: (await params).id, organizationId: context.organization.id } }); return result.count ? new Response(null, { status: 204 }) : apiError("Consentimiento no encontrado", 404); }
