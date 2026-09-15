import { z } from "zod";
import { and, asc, eq, getTableName, ilike, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError, parseDate } from "@/lib/api";
const schema = z.object({ documentNumber: z.string().trim().min(3).max(50), fullName: z.string().trim().min(2).max(160), birthDate: z.string().date().nullable().optional(), sex: z.string().trim().max(30).optional(), phone: z.string().trim().max(40).optional(), email: z.string().email().max(200).optional(), address: z.string().trim().max(300).optional(), city: z.string().trim().max(100).optional() });
export async function GET(request: Request) {
  try {
  const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
  const q = new URL(request.url).searchParams.get("q")?.trim();
  const pattern = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : undefined;
  const rows = await db.query.patients.findMany({
    where: and(eq(patients.organizationId, context.organization.id), pattern ? or(ilike(patients.fullName, pattern), like(patients.documentNumber, pattern)) : undefined),
    extras: (table) => {
      // Explicit identifiers prevent relational v1 from stripping the outer alias inside subqueries.
      const patientId = sql`${sql.identifier(getTableName(table.id.table))}.${sql.identifier(table.id.name)}`;
      return {
        historyCount: sql<number>`(select count(*)::int from "ClinicalHistory" where "ClinicalHistory"."patientId" = ${patientId})`.as("history_count"),
        consentCount: sql<number>`(select count(*)::int from "Consent" where "Consent"."patientId" = ${patientId})`.as("consent_count"),
        referralCount: sql<number>`(select count(*)::int from "Referral" where "Referral"."patientId" = ${patientId})`.as("referral_count"),
        examCount: sql<number>`(select count(*)::int from "Exam" where "Exam"."patientId" = ${patientId})`.as("exam_count"),
      };
    },
    orderBy: asc(patients.fullName),
  });
  return Response.json({ patients: rows.map(({ historyCount, consentCount, referralCount, examCount, ...patient }) => ({ ...patient, _count: { histories: historyCount, consents: consentCount, referrals: referralCount, exams: examCount } })) });
  } catch (error) { return handleApiError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await requireApiContext(); if (!context) return apiError("No autorizado", 401);
    const data = schema.parse(await request.json());
    if (await db.query.patients.findFirst({ where: and(eq(patients.organizationId, context.organization.id), eq(patients.documentNumber, data.documentNumber)) })) return apiError("Ya existe un paciente con este documento", 409);
    const [patient] = await db.insert(patients).values({ ...data, id: crypto.randomUUID(), birthDate: parseDate(data.birthDate), organizationId: context.organization.id }).returning();
    if (!patient) throw new Error("Patient creation returned no row");
    return Response.json({ patient }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
