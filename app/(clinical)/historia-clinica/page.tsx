import type { Metadata } from "next";
import { ClinicalHistoryForm } from "@/components/ClinicalHistoryForm";
import { PageHeading } from "@/components/ui";
import { requirePageContext } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Historia clínica" };
export default async function ClinicalHistoryPage() {
  const { organization } = await requirePageContext();
  const patients = await prisma.patient.findMany({ where: { organizationId: organization.id }, select: { id: true, fullName: true, documentNumber: true }, orderBy: { fullName: "asc" } });
  return <><PageHeading eyebrow="Paciente" title="Historia clínica" description="Registra y conserva la información clínica del paciente." /><ClinicalHistoryForm patients={patients} /></>;
}
