import "dotenv/config";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";

const email = "admin@docli.local";
const password = "DocliDemo2026!";

async function main() {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await auth.api.signUpEmail({ body: { name: "Andrés Torres", email, password } });
    user = await prisma.user.findUniqueOrThrow({ where: { email } });
  }
  user = await prisma.user.update({ where: { id: user.id }, data: { name: "Andrés Torres" } });

  const organization = await prisma.organization.upsert({
    where: { slug: "equipo-central" },
    update: { name: "Equipo Central", plan: "equipo", sector: "Salud" },
    create: { id: "demo-org", slug: "equipo-central", name: "Equipo Central", plan: "equipo", sector: "Salud", teamSize: "2 a 10 personas" },
  });
  await prisma.membership.upsert({
    where: { id: "demo-membership" },
    update: { userId: user.id, organizationId: organization.id, role: "OWNER" },
    create: { id: "demo-membership", userId: user.id, organizationId: organization.id, role: "OWNER" },
  });

  const processData = [
    { id: "demo-process-onboarding", name: "Incorporación de pacientes", area: "Recepción", progress: 72, priority: "HIGH" as const, status: "ACTIVE" as const },
    { id: "demo-process-consents", name: "Gestión de consentimientos", area: "Clínica", progress: 45, priority: "MEDIUM" as const, status: "ACTIVE" as const },
    { id: "demo-process-billing", name: "Cierre mensual", area: "Administración", progress: 88, priority: "MEDIUM" as const, status: "ACTIVE" as const },
  ];
  for (const process of processData) {
    await prisma.process.upsert({ where: { id: process.id }, update: { ...process, ownerName: "Andrés Torres" }, create: { ...process, organizationId: organization.id, ownerName: "Andrés Torres", description: `Flujo demostrativo: ${process.name}` } });
  }
  for (const [position, title] of ["Recibir solicitud", "Validar información", "Confirmar atención"].entries()) {
    await prisma.processStep.upsert({ where: { processId_position: { processId: "demo-process-onboarding", position } }, update: { title }, create: { id: `demo-step-${position}`, processId: "demo-process-onboarding", position, title } });
  }

  const tasks = [
    { id: "demo-task-documents", title: "Validar documentos del paciente", processId: "demo-process-onboarding", status: "IN_PROGRESS" as const, priority: "HIGH" as const },
    { id: "demo-task-consent", title: "Revisar consentimiento", processId: "demo-process-consents", status: "TODO" as const, priority: "MEDIUM" as const },
    { id: "demo-task-close", title: "Conciliar movimientos", processId: "demo-process-billing", status: "DONE" as const, priority: "MEDIUM" as const },
  ];
  for (const task of tasks) await prisma.task.upsert({ where: { id: task.id }, update: { ...task, createdById: user.id, assigneeId: user.id }, create: { ...task, organizationId: organization.id, createdById: user.id, assigneeId: user.id } });

  for (const doc of [
    { id: "demo-document-protocol", name: "Protocolo de ingreso", category: "Protocolo", processId: "demo-process-onboarding", mimeType: "application/pdf" },
    { id: "demo-document-consent", name: "Plantilla de consentimiento", category: "Plantilla", processId: "demo-process-consents", mimeType: "application/pdf" },
  ]) await prisma.document.upsert({ where: { id: doc.id }, update: { ...doc, uploadedById: user.id }, create: { ...doc, organizationId: organization.id, uploadedById: user.id, description: "Referencia documental de demostración" } });

  const patients = [
    { id: "demo-patient-laura", documentNumber: "1022465873", fullName: "Laura Garzón", phone: "310 555 0142", email: "laura@example.test" },
    { id: "demo-patient-valentina", documentNumber: "98362792", fullName: "Valentina García", phone: "315 555 0198", email: "valentina@example.test" },
  ];
  for (const patient of patients) await prisma.patient.upsert({ where: { organizationId_documentNumber: { organizationId: organization.id, documentNumber: patient.documentNumber } }, update: patient, create: { ...patient, organizationId: organization.id } });
  await prisma.clinicalHistory.upsert({ where: { id: "demo-history-laura" }, update: { consultationReason: "Control preventivo", authorId: user.id }, create: { id: "demo-history-laura", organizationId: organization.id, patientId: "demo-patient-laura", authorId: user.id, consultationReason: "Control preventivo", diagnosis: "Paciente estable", treatmentPlan: "Seguimiento semestral" } });
  await prisma.consent.upsert({ where: { id: "demo-consent-laura" }, update: { status: "SIGNED", createdById: user.id }, create: { id: "demo-consent-laura", organizationId: organization.id, patientId: "demo-patient-laura", createdById: user.id, title: "Consentimiento de atención", status: "SIGNED", signedAt: new Date("2026-09-10T15:00:00Z") } });
  await prisma.referral.upsert({ where: { id: "demo-referral-laura" }, update: { status: "SENT", createdById: user.id }, create: { id: "demo-referral-laura", organizationId: organization.id, patientId: "demo-patient-laura", createdById: user.id, specialty: "Radiología", reason: "Imagen diagnóstica", status: "SENT" } });
  await prisma.exam.upsert({ where: { id: "demo-exam-laura" }, update: { status: "ORDERED", createdById: user.id }, create: { id: "demo-exam-laura", organizationId: organization.id, patientId: "demo-patient-laura", createdById: user.id, name: "Radiografía panorámica", type: "Imagen", status: "ORDERED" } });

  console.log("Seed de Docli completado.");
}

main().finally(() => prisma.$disconnect());
