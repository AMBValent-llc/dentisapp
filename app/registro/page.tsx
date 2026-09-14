import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { RegistrationForm } from "@/components/RegistrationForm";
import { getSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Crea un espacio de trabajo en Docli para organizar los procesos de tu equipo.",
};

export default async function RegistrationPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const session = await getSession();
  if (session && await prisma.membership.findFirst({ where: { userId: session.user.id } })) redirect("/dashboard");
  const { plan } = await searchParams;
  const selectedPlan = ["inicial", "equipo", "organizacion"].includes(plan ?? "") ? plan : undefined;
  return (
    <PublicShell>
      <main className="mx-auto grid w-full max-w-295 flex-1 grid-cols-[.85fr_1fr] items-center gap-[clamp(2rem,7vw,6rem)] px-5 py-[clamp(2.5rem,7vw,5rem)] max-[880px]:grid-cols-1" id="main-content">
        <section>
          <span className="text-xs font-extrabold uppercase tracking-[.1em] text-primary">Empieza con un proceso real</span>
          <h1 className="my-3 text-[clamp(2.8rem,6vw,5rem)] font-bold leading-[.96] tracking-[-.06em]">Convierte el trabajo en un sistema compartido.</h1>
          <p className="max-w-130 text-lg leading-8 text-muted">Crea un espacio para tu equipo, define responsables y sigue cada entrega desde el primer día. No necesitas configurar todo para comenzar.</p>
          <div className="mt-8 grid max-w-120 gap-4">
            {[
              ["01", "Crea tu espacio", "Identifica el equipo y el contexto de trabajo."],
              ["02", "Invita a las personas", "Asigna responsables cuando tengas listo el primer flujo."],
              ["03", "Pon un proceso en marcha", "Empieza con algo real y mejóralo mientras se ejecuta."],
            ].map(([number, title, detail]) => (
              <div className="grid grid-cols-[36px_1fr] gap-3 border-b border-line pb-4" key={number}>
                <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-xs font-black text-primary">{number}</span>
                <span className="grid"><strong>{title}</strong><small className="mt-1 text-sm text-muted">{detail}</small></span>
              </div>
            ))}
          </div>
        </section>
        <RegistrationForm selectedPlan={selectedPlan} existingSession={Boolean(session)} />
      </main>
    </PublicShell>
  );
}
