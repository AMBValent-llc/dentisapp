import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, PageHeading, cardClass } from "@/components/ui";
import { requirePageContext } from "@/lib/server-auth";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents as documentTable, patients as patientTable, tasks } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  const { session, organization } = await requirePageContext();
  const [processes, openTasks, patients, documents] = await Promise.all([
    db.query.processes.findMany({
      where: (processes, { eq }) => eq(processes.organizationId, organization.id),
      orderBy: (processes, { desc }) => [desc(processes.updatedAt)],
      limit: 6,
    }),
    db.$count(tasks, and(eq(tasks.organizationId, organization.id), ne(tasks.status, "DONE"))),
    db.$count(patientTable, eq(patientTable.organizationId, organization.id)),
    db.$count(documentTable, eq(documentTable.organizationId, organization.id)),
  ]);
  return <><PageHeading eyebrow="Resumen operativo" title={`Hola, ${session.user.name.split(" ")[0]}`} description="Datos actuales de tu espacio de trabajo." action={<ButtonLink href="/procesos/nuevo">＋ Nuevo proceso</ButtonLink>} />
    <section className="mb-5 grid grid-cols-4 gap-4 max-[1050px]:grid-cols-2 max-sm:grid-cols-1">{[[processes.filter((p) => p.status === "ACTIVE").length, "Procesos activos"], [openTasks, "Tareas abiertas"], [patients, "Pacientes"], [documents, "Documentos"]].map(([value, label]) => <article className={`${cardClass} p-5`} key={label}><p className="m-0 text-sm text-muted">{label}</p><strong className="my-1 block text-3xl">{value}</strong></article>)}</section>
    <section className={`${cardClass} overflow-hidden p-4`}><header className="flex justify-between px-2 pb-3"><h2 className="m-0 text-xl font-bold">Procesos recientes</h2><Link className="text-sm font-bold text-primary" href="/procesos">Ver todos</Link></header><div className="overflow-x-auto"><table className="w-full min-w-150"><thead><tr>{["Proceso", "Responsable", "Avance", "Estado"].map((h) => <th className="border-b border-line p-3 text-left text-xs uppercase text-muted" key={h}>{h}</th>)}</tr></thead><tbody>{processes.map((process) => <tr key={process.id}><td className="border-b border-line p-3 font-bold">{process.name}</td><td className="border-b border-line p-3">{process.ownerName ?? "Sin asignar"}</td><td className="border-b border-line p-3">{process.progress}%</td><td className="border-b border-line p-3">{process.status}</td></tr>)}</tbody></table></div></section>
  </>;
}
