import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/PublicShell";
import { LoginForm } from "@/components/LoginForm";
import { getDemoLoginCredentials } from "@/lib/demo-login";
import { getSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  const requestHeaders = await headers();
  const demoCredentials = getDemoLoginCredentials(process.env, requestHeaders.get("host") ?? undefined);
  return <PublicShell><main className="mx-auto grid w-full max-w-295 flex-1 grid-cols-[1.1fr_.8fr] items-center gap-[clamp(2rem,7vw,6rem)] px-5 py-[clamp(2.5rem,7vw,6rem)] max-[880px]:grid-cols-1" id="main-content">
    <section><span className="text-xs font-extrabold uppercase tracking-[.1em] text-primary">Gestión de procesos para equipos</span><h1 className="my-2 text-[clamp(3rem,7vw,5.6rem)] font-bold text-primary">Docli</h1><p className="text-lg text-muted">Vuelve a tu espacio de trabajo para revisar avances, resolver bloqueos y mantener cada proceso en movimiento. Tus tareas, responsables, documentos y reportes conservan el contexto que el equipo necesita para continuar.</p><ul className="mt-6 grid gap-3 p-0 text-sm text-muted"><li className="list-none">✓ Una vista común para distintas áreas</li><li className="list-none">✓ Historial claro de decisiones y estados</li><li className="list-none">✓ Módulos generales y especializados</li></ul></section>
    <Suspense fallback={<section className="rounded-3xl border border-line bg-white p-[clamp(1.4rem,4vw,2.5rem)] shadow-card" aria-busy="true">Cargando acceso…</section>}><LoginForm demoCredentials={demoCredentials} /></Suspense>
  </main></PublicShell>;
}
