import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { patients, referrals } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ patientId: z.string().min(1), specialty: z.string().trim().min(2).max(160), provider: z.string().trim().max(160).optional(), reason: z.string().trim().min(2).max(3000), status: z.enum(["DRAFT", "SENT", "ACCEPTED", "COMPLETED", "CANCELLED"]).optional(), referredAt: z.string().datetime().nullable().optional(), notes: z.string().trim().max(3000).optional() });
export async function GET() {
  try {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  return Response.json({ referrals: await db.query.referrals.findMany({ where: eq(referrals.organizationId, context.organization.id), with: { patient: { columns: { id: true, fullName: true, documentNumber: true } } }, orderBy: desc(referrals.createdAt) }) });
  } catch (error) { return handleApiError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (!await db.query.patients.findFirst({ where: and(eq(patients.id, data.patientId), eq(patients.organizationId, context.organization.id)) })) return apiError("Paciente no válido", 422);
    const [referral] = await db.insert(referrals).values({ ...data, id: crypto.randomUUID(), referredAt: parseDate(data.referredAt), organizationId: context.organization.id, createdById: context.session.user.id }).returning();
    if (!referral) throw new Error("Referral creation returned no row");
    return Response.json({ referral }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
