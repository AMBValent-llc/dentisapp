import type { Metadata } from "next";
import { PageHeading, cardClass } from "@/components/ui";
import { requirePageContext } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { TaskStatusButton } from "@/components/TaskStatusButton";

export const metadata: Metadata = { title: "Tareas" };
const labels = { TODO: "Pendientes", IN_PROGRESS: "En curso", BLOCKED: "Bloqueadas", DONE: "Completadas" };

export default async function TasksPage() {
  const { organization } = await requirePageContext();
  const tasks = await prisma.task.findMany({ where: { organizationId: organization.id }, include: { process: true, assignee: true }, orderBy: { dueDate: "asc" } });
  return <><PageHeading eyebrow="Operaciones" title="Tareas" description="Pendientes del equipo organizados por estado, proceso y fecha." />
    <section className="mb-5 flex flex-wrap gap-3 rounded-2xl border border-line bg-white p-4 text-sm"><strong>Vista del equipo</strong><span className="text-muted">{tasks.filter((task) => task.status !== "DONE").length} abiertas</span><span className="text-danger">{tasks.filter((task) => task.dueDate && task.dueDate < new Date() && task.status !== "DONE").length} vencidas</span></section>
    <div className="grid grid-cols-4 items-start gap-4 max-[1050px]:grid-cols-2 max-sm:grid-cols-1">{Object.entries(labels).map(([status, label]) => { const items = tasks.filter((task) => task.status === status); return <section className="rounded-[18px] bg-[#edf3f3] p-3" key={status}><header className="flex items-center justify-between px-1 pb-3"><h2 className="m-0 text-base font-bold">{label}</h2><span className="grid size-7 place-items-center rounded-full bg-white text-xs font-bold">{items.length}</span></header><div className="grid gap-3">{items.map((task) => <article className={`${cardClass} p-4`} key={task.id}><span className="text-xs font-bold text-primary">{task.process?.name ?? "Tarea general"}</span><h3 className="mb-4 mt-2 text-base font-bold">{task.title}</h3><div className="flex items-center justify-between border-t border-line pt-3 text-xs"><span>{task.assignee?.name ?? "Sin asignar"}</span><time className="text-muted">{task.dueDate?.toLocaleDateString("es-CO") ?? "Sin fecha"}</time></div><TaskStatusButton id={task.id} done={task.status === "DONE"} /></article>)}</div></section>; })}</div>
  </>;
}
