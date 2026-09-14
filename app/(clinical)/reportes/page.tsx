import type { Metadata } from "next";
import { PageHeading, cardClass } from "@/components/ui";
import { requirePageContext } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Reportes" };
export default async function ReportsPage() {
  const { organization } = await requirePageContext();
  const [tasks, processes, patients, histories] = await Promise.all([
    prisma.task.findMany({ where: { organizationId: organization.id }, select: { status: true, dueDate: true } }),
    prisma.process.findMany({ where: { organizationId: organization.id }, select: { name: true, progress: true } }),
    prisma.patient.count({ where: { organizationId: organization.id } }),
    prisma.clinicalHistory.count({ where: { organizationId: organization.id } }),
  ]);
  const completed = tasks.filter((task) => task.status === "DONE").length;
  const completion = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const overdue = tasks.filter((task) => task.status !== "DONE" && task.dueDate && task.dueDate < new Date()).length;
  return <><PageHeading eyebrow="Resultados" title="Reportes operativos" description="Indicadores calculados desde los registros del equipo." />
    <section className="mb-5 grid grid-cols-4 gap-4 max-sm:grid-cols-1">{[[`${completion}%`, "Tareas completadas"], [tasks.length - completed, "Tareas abiertas"], [overdue, "Tareas vencidas"], [patients, "Pacientes"]].map(([value, label]) => <article className={`${cardClass} p-5`} key={label}><span className="text-sm text-muted">{label}</span><strong className="my-1 block text-3xl">{value}</strong></article>)}</section>
    <div className="grid grid-cols-2 gap-5 max-[880px]:grid-cols-1"><section className={`${cardClass} p-6`}><h2 className="mt-0 text-xl font-bold">Avance por proceso</h2><div className="grid gap-5">{processes.map((process) => <div key={process.name}><div className="flex justify-between text-sm"><span>{process.name}</span><strong>{process.progress}%</strong></div><div className="h-3 rounded-full bg-[#e6eeee]"><span className="block h-full rounded-full bg-primary" style={{ width: `${process.progress}%` }} /></div></div>)}</div></section><section className={`${cardClass} p-6`}><h2 className="mt-0 text-xl font-bold">Actividad clínica</h2><p className="text-4xl font-bold">{histories}</p><p className="text-muted">historias para {patients} pacientes registrados.</p></section></div>
  </>;
}
