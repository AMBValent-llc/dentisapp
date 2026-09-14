import { ButtonLink, PageHeading, cardClass } from "./ui";

export function EmptyClinicalPage({ title, icon, heading, children }: { title: string; icon: string; heading: string; children: React.ReactNode }) {
  return <><PageHeading eyebrow="Complementos clínicos" title={title} /><section className={`${cardClass} grid min-h-90 place-items-center p-4 text-center`}><div><span className="mx-auto grid size-17.5 place-items-center rounded-[20px] bg-primary-soft text-3xl text-primary">{icon}</span><h2 className="mt-5 text-2xl font-bold">{heading}</h2><p className="mx-auto max-w-[48ch] text-muted">{children}</p><ButtonLink href="/pacientes">Seleccionar paciente</ButtonLink></div></section></>;
}
