import type { Metadata } from "next";
import { ClinicalHistoryForm } from "@/components/ClinicalHistoryForm";
import { PageHeading } from "@/components/ui";
import { requirePageContext } from "@/lib/server-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Historia clínica" };
export default async function ClinicalHistoryPage() {
  const { organization } = await requirePageContext();
  const patients = await db.query.patients.findMany({
    where: (patients, { eq }) => eq(patients.organizationId, organization.id),
    columns: { id: true, fullName: true, documentNumber: true },
    orderBy: (patients, { asc }) => [asc(patients.fullName)],
  });
  return <><PageHeading eyebrow="Paciente" title="Historia clínica" description="Registra y conserva la información clínica del paciente." /><ClinicalHistoryForm patients={patients} /></>;
}
