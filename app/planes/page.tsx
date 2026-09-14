import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { PlanCards } from "@/components/PlanCards";

export const metadata: Metadata = { title: "Planes" };
export default function PlansPage() {
  return <PublicShell><main id="main-content" className="mx-auto w-full max-w-295 flex-1 px-5 py-[clamp(2.5rem,7vw,6rem)]"><div className="mx-auto mb-14 max-w-190 text-center"><span className="text-xs font-extrabold uppercase tracking-[.1em] text-primary">Elige según tu operación</span><h1 className="my-2 text-[clamp(2.3rem,5vw,4rem)] font-bold">Planes que crecen con tus procesos</h1><p className="text-lg text-muted">Empieza con los flujos críticos de un equipo y amplía cuando necesites sumar áreas, permisos y reportes consolidados. Todos incluyen actualizaciones y soporte.</p></div><PlanCards /><p className="mx-auto mt-10 max-w-180 text-center text-sm text-muted">¿Necesitas conservar flujos especializados o definir una implementación por etapas? <a className="font-bold text-primary" href="/contacto">Cuéntanos cómo trabaja tu equipo.</a></p></main></PublicShell>;
}
