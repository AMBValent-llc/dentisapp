import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import { clinicalHistories, consents, documents, exams, memberships, organizations, patients, processes, processSteps, referrals, tasks, users } from "../lib/db/schema";

const email = "admin@docli.local";
const password = "DocliDemo2026!";

export async function seed() {
  loadEnvConfig(process.cwd());
  if (!["development", "test"].includes(process.env.NODE_ENV ?? "") || process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seed is test-only: set NODE_ENV=test and ALLOW_DEMO_SEED=true explicitly.");
  }
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!process.env.DATABASE_TARGET_HOST || url.hostname !== process.env.DATABASE_TARGET_HOST) {
    throw new Error("Set DATABASE_TARGET_HOST to the verified non-production DATABASE_URL hostname.");
  }
  const { db } = await import("../lib/db");
  const { getAuth } = await import("../lib/auth");
  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    await getAuth().api.signUpEmail({ body: { name: "Andrés Torres", email, password } });
    user = await db.query.users.findFirst({ where: eq(users.email, email) });
  }
  if (!user) throw new Error("Demo user creation failed.");
  const credential = await db.query.accounts.findFirst({
    where: (t, { and, eq }) => and(eq(t.userId, user.id), eq(t.providerId, "credential")),
  });
  if (!credential?.password) throw new Error("Demo user has no password credential; refusing to create inconsistent demo data.");
  await db.update(users).set({ name: "Andrés Torres" }).where(eq(users.id, user.id));

  const [organization] = await db.insert(organizations).values({
    id: "demo-org", slug: "equipo-central", name: "Equipo Central", plan: "equipo", sector: "Salud", teamSize: "2 a 10 personas",
  }).onConflictDoUpdate({
    target: organizations.slug, set: { name: "Equipo Central", plan: "equipo", sector: "Salud" },
  }).returning();
  await db.insert(memberships).values({
    id: "demo-membership", userId: user.id, organizationId: organization.id, role: "OWNER",
  }).onConflictDoUpdate({
    target: memberships.id, set: { userId: user.id, organizationId: organization.id, role: "OWNER" },
  });

  const processData = [
    { id: "demo-process-onboarding", name: "Incorporación de pacientes", area: "Recepción", progress: 72, priority: "HIGH" as const, status: "ACTIVE" as const },
    { id: "demo-process-consents", name: "Gestión de consentimientos", area: "Clínica", progress: 45, priority: "MEDIUM" as const, status: "ACTIVE" as const },
    { id: "demo-process-billing", name: "Cierre mensual", area: "Administración", progress: 88, priority: "MEDIUM" as const, status: "ACTIVE" as const },
  ];
  for (const process of processData) {
    await db.insert(processes).values({
      ...process, organizationId: organization.id, ownerName: "Andrés Torres", description: `Flujo demostrativo: ${process.name}`,
    }).onConflictDoUpdate({ target: processes.id, set: { ...process, ownerName: "Andrés Torres" } });
  }
  for (const [position, title] of ["Recibir solicitud", "Validar información", "Confirmar atención"].entries()) {
    await db.insert(processSteps).values({
      id: `demo-step-${position}`, processId: "demo-process-onboarding", position, title,
    }).onConflictDoUpdate({ target: [processSteps.processId, processSteps.position], set: { title } });
  }

  const taskData = [
    { id: "demo-task-documents", title: "Validar documentos del paciente", processId: "demo-process-onboarding", status: "IN_PROGRESS" as const, priority: "HIGH" as const },
    { id: "demo-task-consent", title: "Revisar consentimiento", processId: "demo-process-consents", status: "TODO" as const, priority: "MEDIUM" as const },
    { id: "demo-task-close", title: "Conciliar movimientos", processId: "demo-process-billing", status: "DONE" as const, priority: "MEDIUM" as const },
  ];
  for (const task of taskData) {
    await db.insert(tasks).values({
      ...task, organizationId: organization.id, createdById: user.id, assigneeId: user.id,
    }).onConflictDoUpdate({ target: tasks.id, set: { ...task, createdById: user.id, assigneeId: user.id } });
  }
  for (const document of [
    { id: "demo-document-protocol", name: "Protocolo de ingreso", category: "Protocolo", processId: "demo-process-onboarding", mimeType: "application/pdf" },
    { id: "demo-document-consent", name: "Plantilla de consentimiento", category: "Plantilla", processId: "demo-process-consents", mimeType: "application/pdf" },
  ]) {
    await db.insert(documents).values({
      ...document, organizationId: organization.id, uploadedById: user.id, description: "Referencia documental de demostración",
    }).onConflictDoUpdate({ target: documents.id, set: { ...document, uploadedById: user.id } });
  }

  let lauraId: string | undefined;
  for (const patient of [
    { id: "demo-patient-laura", documentNumber: "1022465873", fullName: "Laura Garzón", phone: "310 555 0142", email: "laura@example.test" },
    { id: "demo-patient-valentina", documentNumber: "98362792", fullName: "Valentina García", phone: "315 555 0198", email: "valentina@example.test" },
  ]) {
    const { id, ...details } = patient;
    // Preserve the existing patient's ID when its natural key already exists.
    const [record] = await db.insert(patients).values({ id, ...details, organizationId: organization.id })
      .onConflictDoUpdate({ target: [patients.organizationId, patients.documentNumber], set: details }).returning({ id: patients.id });
    if (id === "demo-patient-laura") lauraId = record.id;
  }
  if (!lauraId) throw new Error("Demo patient creation failed.");
  await db.batch([
    db.insert(clinicalHistories).values({
      id: "demo-history-laura", organizationId: organization.id, patientId: lauraId, authorId: user.id,
      consultationReason: "Control preventivo", diagnosis: "Paciente estable", treatmentPlan: "Seguimiento semestral",
    }).onConflictDoUpdate({ target: clinicalHistories.id, set: { consultationReason: "Control preventivo", authorId: user.id } }),
    db.insert(consents).values({
      id: "demo-consent-laura", organizationId: organization.id, patientId: lauraId, createdById: user.id,
      title: "Consentimiento de atención", status: "SIGNED", signedAt: new Date("2026-09-10T15:00:00Z"),
    }).onConflictDoUpdate({ target: consents.id, set: { status: "SIGNED", createdById: user.id } }),
    db.insert(referrals).values({
      id: "demo-referral-laura", organizationId: organization.id, patientId: lauraId, createdById: user.id,
      specialty: "Radiología", reason: "Imagen diagnóstica", status: "SENT",
    }).onConflictDoUpdate({ target: referrals.id, set: { status: "SENT", createdById: user.id } }),
    db.insert(exams).values({
      id: "demo-exam-laura", organizationId: organization.id, patientId: lauraId, createdById: user.id,
      name: "Radiografía panorámica", type: "Imagen", status: "ORDERED",
    }).onConflictDoUpdate({ target: exams.id, set: { status: "ORDERED", createdById: user.id } }),
  ]);
  console.log("Seed de Docli completado.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  });
}
