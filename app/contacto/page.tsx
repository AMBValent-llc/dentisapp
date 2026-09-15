import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { FeedbackForm } from "@/components/FeedbackForm";
import { buttonClass, fieldClass, labelClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Habla con Docli sobre implementación, soporte o gestión de procesos.",
};

const contactReasons = [
  {
    icon: "◎",
    title: "Evaluar Docli",
    description: "Revisemos el proceso que quieres ordenar, el tamaño del equipo y un punto de partida realista.",
    action: "Hablar sobre implementación",
  },
  {
    icon: "◇",
    title: "Soporte de producto",
    description: "Resuelve dudas de configuración, acceso o uso de tu espacio de trabajo actual.",
    action: "Solicitar soporte",
  },
  {
    icon: "↗",
    title: "Alianzas e integraciones",
    description: "Conversemos sobre integraciones, servicios complementarios o colaboración entre equipos.",
    action: "Proponer una alianza",
  },
];

const frequentlyAsked = [
  ["¿Necesito tener mis procesos documentados?", "No. Podemos empezar con un proceso que hoy viva en mensajes, hojas de cálculo o conocimiento informal del equipo."],
  ["¿Cuánto tarda una implementación?", "Depende del alcance. Un equipo puede poner en marcha su primer flujo en pocos días y ampliar el espacio de forma gradual."],
  ["¿Puedo conservar módulos especializados?", "Sí. Docli combina un núcleo común de procesos con módulos adaptados a contextos que requieren información específica."],
];

export default function ContactPage() {
  return (
    <PublicShell>
      <main id="main-content" className="flex-1">
        <section className="border-b border-line bg-[radial-gradient(circle_at_85%_15%,rgb(8_127_140/0.1),transparent_30%)]">
          <div className="mx-auto grid min-h-120 w-full max-w-295 grid-cols-[1.15fr_.85fr] items-center gap-[clamp(2.5rem,7vw,7rem)] px-5 py-[clamp(4rem,8vw,7rem)] max-[880px]:grid-cols-1">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[.12em] text-primary">Contacto institucional</span>
              <h1 className="mb-5 mt-3 max-w-180 text-[clamp(3rem,6vw,5.4rem)] font-bold leading-[.98] tracking-[-.06em]">Empecemos por entender el trabajo.</h1>
              <p className="max-w-155 text-lg leading-8 text-muted">Cuéntanos qué proceso necesita más claridad. Te ayudaremos a definir el alcance, identificar responsables y decidir si Docli es una buena solución para tu equipo.</p>
              <a className={`${buttonClass} mt-5`} href="#formulario-contacto">Enviar una consulta →</a>
            </div>
            <aside className="rounded-3xl border border-line bg-white p-[clamp(1.5rem,4vw,2.5rem)] shadow-card" aria-label="Proceso de atención">
              <span className="text-xs font-extrabold uppercase tracking-[.1em] text-primary">Qué ocurre después</span>
              <ol className="mb-0 mt-6 grid list-none gap-5 p-0">
                {[
                  ["01", "Leemos el contexto", "Revisamos el proceso, el área y el resultado que necesitas."],
                  ["02", "Definimos la conversación", "Tu solicitud llega al equipo adecuado, sin intermediarios innecesarios."],
                  ["03", "Acordamos el siguiente paso", "Recibirás una respuesta clara durante el siguiente día hábil."],
                ].map(([number, title, description]) => (
                  <li className="grid grid-cols-[36px_1fr] gap-3" key={number}>
                    <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-xs font-black text-primary">{number}</span>
                    <span className="grid"><strong>{title}</strong><small className="mt-1 text-sm leading-6 text-muted">{description}</small></span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </section>

        <section className="mx-auto w-full max-w-295 px-5 py-[clamp(4rem,8vw,7rem)]" aria-labelledby="contact-reasons-title">
          <div className="mb-10 max-w-160">
            <span className="text-xs font-extrabold uppercase tracking-[.1em] text-primary">Canales de atención</span>
            <h2 className="mb-3 mt-2 text-[clamp(2rem,4vw,3.2rem)] font-bold" id="contact-reasons-title">Una entrada clara para cada necesidad</h2>
            <p className="text-muted">Selecciona el motivo más cercano a tu caso dentro del formulario. Nosotros nos encargamos de dirigirlo.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-[880px]:grid-cols-1">
            {contactReasons.map((reason) => (
              <article className="group flex min-h-65 flex-col rounded-[20px] border border-line bg-white p-6 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft" key={reason.title}>
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-lg font-black text-primary transition group-hover:bg-primary group-hover:text-white" aria-hidden="true">{reason.icon}</span>
                <h3 className="mb-2 mt-6 text-xl font-bold">{reason.title}</h3>
                <p className="m-0 flex-1 text-sm leading-6 text-muted">{reason.description}</p>
                <a className="mt-4 inline-flex min-h-11 items-center text-sm font-extrabold text-primary no-underline" href="#formulario-contacto">{reason.action} →</a>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#153740] px-5 py-[clamp(4rem,8vw,7rem)] text-white" id="formulario-contacto">
          <div className="mx-auto grid w-full max-w-295 grid-cols-[.75fr_1.25fr] gap-[clamp(2.5rem,7vw,7rem)] max-[880px]:grid-cols-1">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[.1em] text-[#78d1ca]">Describe tu caso</span>
              <h2 className="my-3 text-[clamp(2.2rem,4vw,3.5rem)] font-bold">La información justa para responder bien.</h2>
              <p className="leading-7 text-[#b8ced1]">No necesitas preparar una presentación. Explica cómo se ejecuta hoy el trabajo, dónde se pierde tiempo y qué te gustaría poder observar.</p>
              <div className="mt-8 border-l-2 border-primary pl-4 text-sm text-[#b8ced1]">
                <strong className="block text-white">Tiempo de respuesta</strong>
                Durante el siguiente día hábil.
              </div>
            </div>

            <div className="rounded-3xl bg-white p-[clamp(1.4rem,4vw,2.5rem)] text-ink shadow-card">
              <FeedbackForm className="grid grid-cols-2 gap-4 max-sm:grid-cols-1" message="Recibimos tu consulta. El equipo de Docli revisará el contexto y te responderá pronto.">
                <label className={labelClass}>
                  Motivo de contacto
                  <select className={fieldClass} name="motivo" defaultValue="" required>
                    <option value="" disabled>Seleccionar</option>
                    <option>Evaluar Docli</option>
                    <option>Soporte de producto</option>
                    <option>Alianzas e integraciones</option>
                    <option>Otro</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Nombre
                  <input className={fieldClass} name="nombre" autoComplete="name" placeholder="Tu nombre" required />
                </label>
                <label className={labelClass}>
                  Correo de trabajo
                  <input className={fieldClass} name="correo" type="email" autoComplete="email" placeholder="nombre@empresa.com" required />
                </label>
                <label className={labelClass}>
                  Equipo u organización
                  <input className={fieldClass} name="organizacion" autoComplete="organization" placeholder="Nombre del equipo" required />
                </label>
                <label className={`${labelClass} col-span-full`}>
                  ¿Qué necesitas resolver?
                  <textarea className={`${fieldClass} min-h-32 resize-y`} name="mensaje" placeholder="Describe el proceso actual, las personas involucradas y el resultado que buscas…" required />
                </label>
                <div className="col-span-full flex items-start gap-3 text-sm text-muted">
                  <input aria-describedby="contact-privacy-details" className="mt-1 size-4 accent-primary" id="contact-privacy" name="privacidad" type="checkbox" required />
                  <div>
                    <label className="font-medium text-white" htmlFor="contact-privacy">Acepto que Docli trate esta información para atender mi solicitud.</label>{" "}
                    <span id="contact-privacy-details">Consulta la <Link aria-label="Política de privacidad, abre en una pestaña nueva" className="font-semibold text-white underline decoration-white/50 underline-offset-2" href="/privacidad" rel="noopener noreferrer" target="_blank">Política de privacidad</Link>.</span>
                  </div>
                </div>
                <button className={`${buttonClass} col-span-full justify-self-end max-sm:w-full`} type="submit">Enviar consulta →</button>
              </FeedbackForm>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-295 grid-cols-[.65fr_1.35fr] gap-[clamp(2rem,7vw,6rem)] px-5 py-[clamp(4rem,8vw,7rem)] max-[880px]:grid-cols-1" aria-labelledby="faq-title">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[.1em] text-primary">Antes de escribirnos</span>
            <h2 className="mb-3 mt-2 text-3xl font-bold" id="faq-title">Preguntas frecuentes</h2>
            <p className="text-sm leading-6 text-muted">Si ya tienes una cuenta y necesitas ayuda operativa, también puedes ingresar a tu espacio y consultar el contexto del proceso.</p>
            <Link className="text-sm font-extrabold text-primary" href="/login">Ir a mi espacio →</Link>
          </div>
          <div className="border-t border-line">
            {frequentlyAsked.map(([question, answer]) => (
              <details className="group border-b border-line py-5" key={question}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-bold marker:hidden">{question}<span className="text-xl font-normal text-primary transition group-open:rotate-45" aria-hidden="true">＋</span></summary>
                <p className="mb-0 max-w-170 pr-10 text-sm leading-7 text-muted">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
