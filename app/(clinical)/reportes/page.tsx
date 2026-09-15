import type { Metadata } from "next";
import { PageHeading, cardClass } from "@/components/ui";
import { requirePageContext } from "@/lib/server-auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clinicalHistories, patients as patientTable } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Reportes" };
export default async function ReportsPage() {
  const { organization } = await requirePageContext();
  const [tasks, processes, patients, histories] = await Promise.all([
    db.query.tasks.findMany({
      where: (tasks, { eq }) => eq(tasks.organizationId, organization.id),
      columns: { status: true, dueDate: true },
    }),
    db.query.processes.findMany({
      where: (processes, { eq }) => eq(processes.organizationId, organization.id),
      columns: { name: true, progress: true },
    }),
    db.$count(patientTable, eq(patientTable.organizationId, organization.id)),
    db.$count(clinicalHistories, eq(clinicalHistories.organizationId, organization.id)),
  ]);
  const completed = tasks.filter((task) => task.status === "DONE").length;
  const completion = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const overdue = tasks.filter((task) => task.status !== "DONE" && task.dueDate && task.dueDate < new Date()).length;
  return <><PageHeading eyebrow="Resultados" title="Reportes operativos" description="Indicadores calculados desde los registros del equipo." />
    <section className="mb-5 grid grid-cols-4 gap-4 max-sm:grid-cols-1">{[[`${completion}%`, "Tareas completadas"], [tasks.length - completed, "Tareas abiertas"], [overdue, "Tareas vencidas"], [patients, "Pacientes"]].map(([value, label]) => <article className={`${cardClass} p-5`} key={label}><span className="text-sm text-muted">{label}</span><strong className="my-1 block text-3xl">{value}</strong></article>)}</section>
    <div className="grid grid-cols-2 gap-5 max-[880px]:grid-cols-1"><section className={`${cardClass} p-6`}><h2 className="mt-0 text-xl font-bold">Avance por proceso</h2><div className="grid gap-5">{processes.map((process) => <div key={process.name}><div className="flex justify-between text-sm"><span>{process.name}</span><strong>{process.progress}%</strong></div><div className="h-3 rounded-full bg-[#e6eeee]"><span className="block h-full rounded-full bg-primary" style={{ width: `${process.progress}%` }} /></div></div>)}</div></section><section className={`${cardClass} p-6`}><h2 className="mt-0 text-xl font-bold">Actividad clínica</h2><p className="text-4xl font-bold">{histories}</p><p className="text-muted">historias para {patients} pacientes registrados.</p></section></div>
  </>;
}
