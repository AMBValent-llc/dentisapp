import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { consents, patients } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ patientId: z.string().min(1), title: z.string().trim().min(2).max(200), body: z.string().trim().max(10000).optional(), status: z.enum(["DRAFT", "PENDING", "SIGNED", "REVOKED"]).optional(), signedAt: z.string().datetime().nullable().optional(), expiresAt: z.string().datetime().nullable().optional() });
export async function GET() {
  try {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  return Response.json({ consents: await db.query.consents.findMany({ where: eq(consents.organizationId, context.organization.id), with: { patient: { columns: { id: true, fullName: true, documentNumber: true } } }, orderBy: desc(consents.createdAt) }) });
  } catch (error) { return handleApiError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (!await db.query.patients.findFirst({ where: and(eq(patients.id, data.patientId), eq(patients.organizationId, context.organization.id)) })) return apiError("Paciente no válido", 422);
    const [consent] = await db.insert(consents).values({ ...data, id: crypto.randomUUID(), signedAt: parseDate(data.signedAt), expiresAt: parseDate(data.expiresAt), organizationId: context.organization.id, createdById: context.session.user.id }).returning();
    if (!consent) throw new Error("Consent creation returned no row");
    return Response.json({ consent }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
