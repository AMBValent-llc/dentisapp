import type { Metadata } from "next";
import { ClinicalRecordForm } from "@/components/ClinicalRecordForm";
import { PageHeading, cardClass } from "@/components/ui";
import { requirePageContext } from "@/lib/server-auth";
import { db } from "@/lib/db";
export const metadata: Metadata = { title: "Remisiones" };
export default async function Page() {
  const { organization } = await requirePageContext();
  const [patients, records] = await Promise.all([
    db.query.patients.findMany({
      where: (patients, { eq }) => eq(patients.organizationId, organization.id),
      columns: { id: true, fullName: true },
    }),
    db.query.referrals.findMany({
      where: (referrals, { eq }) => eq(referrals.organizationId, organization.id),
      with: { patient: true },
      orderBy: (referrals, { desc }) => [desc(referrals.createdAt)],
    }),
  ]);
  return <><PageHeading eyebrow="Gestión clínica" title="Remisiones" /><ClinicalRecordForm kind="referrals" patients={patients} /><section className={`${cardClass} p-4`}>{records.map((record) => <article className="border-b border-line p-3" key={record.id}><b>{record.specialty}</b><p className="m-0 text-sm text-muted">{record.patient.fullName} · {record.reason} · {record.status}</p></article>)}{!records.length && <p className="text-muted">Sin remisiones.</p>}</section></>;
}
