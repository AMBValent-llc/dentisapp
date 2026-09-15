import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, PageHeading, cardClass } from "@/components/ui";
import { db } from "@/lib/db";
import { containsPattern } from "@/lib/db/search";
import { requirePageContext } from "@/lib/server-auth";

export const metadata: Metadata = { title: "Pacientes" };
export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { organization } = await requirePageContext();
  const query = (await searchParams).q?.trim() ?? "";
  const visible = await db.query.patients.findMany({
    where: (patients, { and, eq, ilike, like, or }) => and(
      eq(patients.organizationId, organization.id),
      query ? or(ilike(patients.fullName, containsPattern(query)), like(patients.documentNumber, containsPattern(query))) : undefined,
    ),
    with: {
      histories: {
        columns: { createdAt: true },
        orderBy: (histories, { desc }) => [desc(histories.createdAt)],
        limit: 1,
      },
    },
    orderBy: (patients, { asc }) => [asc(patients.fullName)],
  });
  return <><PageHeading eyebrow="Gestión clínica" title="Pacientes" description="Consulta y gestiona la actividad del consultorio" action={<ButtonLink href="/pacientes/nuevo">Nuevo paciente</ButtonLink>} />{query && <p className="rounded-xl bg-primary-soft px-4 py-3 text-primary-dark" role="status">{visible.length ? `${visible.length} resultado${visible.length === 1 ? "" : "s"} para “${query}”.` : `No encontramos pacientes con “${query}”.`}</p>}<section className={`${cardClass} overflow-hidden p-4`} aria-label="Listado de pacientes"><div className="overflow-x-auto"><table className="w-full min-w-180 border-collapse"><thead><tr>{["Documento","Nombre completo","Teléfono","Última atención","Acción"].map((heading) => <th className="border-b border-[#edf2f2] bg-[#f6f9f9] p-4 text-left text-xs uppercase text-muted" key={heading}>{heading}</th>)}</tr></thead><tbody>{visible.map((patient) => <tr key={patient.id}><td className="whitespace-nowrap border-b border-[#edf2f2] p-4">{patient.documentNumber}</td><td className="whitespace-nowrap border-b border-[#edf2f2] p-4">{patient.fullName}</td><td className="whitespace-nowrap border-b border-[#edf2f2] p-4">{patient.phone ?? "—"}</td><td className="whitespace-nowrap border-b border-[#edf2f2] p-4">{patient.histories[0]?.createdAt.toLocaleDateString("es-CO") ?? "Sin historia"}</td><td className="whitespace-nowrap border-b border-[#edf2f2] p-4"><Link className="inline-block rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white no-underline" href="/historia-clinica">Nueva historia</Link></td></tr>)}</tbody></table>{!visible.length && <div className="p-8 text-center text-muted">Prueba con otro nombre o documento.</div>}</div></section></>;
}
