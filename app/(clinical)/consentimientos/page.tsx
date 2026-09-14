import type { Metadata } from "next";
import { ClinicalRecordForm } from "@/components/ClinicalRecordForm";
import { PageHeading, cardClass } from "@/components/ui";
import { requirePageContext } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
export const metadata: Metadata = { title: "Consentimientos" };
export default async function Page() {
  const { organization } = await requirePageContext();
  const [patients, records] = await Promise.all([prisma.patient.findMany({ where: { organizationId: organization.id }, select: { id: true, fullName: true } }), prisma.consent.findMany({ where: { organizationId: organization.id }, include: { patient: true }, orderBy: { createdAt: "desc" } })]);
  return <><PageHeading eyebrow="Gestión clínica" title="Consentimientos informados" /><ClinicalRecordForm kind="consents" patients={patients} /><section className={`${cardClass} p-4`}>{records.map((record) => <article className="border-b border-line p-3" key={record.id}><b>{record.title}</b><p className="m-0 text-sm text-muted">{record.patient.fullName} · {record.status} · {record.createdAt.toLocaleDateString("es-CO")}</p></article>)}{!records.length && <p className="text-muted">Sin consentimientos.</p>}</section></>;
}
