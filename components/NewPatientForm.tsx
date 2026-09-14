"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ButtonLink, buttonClass, fieldClass, labelClass } from "./ui";
import { useRouter } from "next/navigation";
import { FeedbackDialog } from "./Feedback";
import { readApiError } from "@/lib/client-errors";

const sectionClass = "rounded-[18px] border border-line bg-white p-[clamp(1.2rem,3vw,2rem)] shadow-soft";
const gridClass = "mt-4 grid grid-cols-2 gap-4 max-sm:grid-cols-1";

export function NewPatientForm() {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  function update(event: FormEvent<HTMLFormElement>) {
    const fields = Array.from(event.currentTarget.elements).filter((element): element is HTMLInputElement | HTMLSelectElement => element instanceof HTMLInputElement || element instanceof HTMLSelectElement);
    setProgress(Math.round(fields.filter((field) => field.value.trim()).length / fields.length * 100));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        fullName: data.get("nombre"), documentNumber: data.get("documento"), birthDate: data.get("fechaNacimiento") || undefined,
        sex: data.get("sexo") || undefined, phone: data.get("telefono"), email: data.get("correo") || undefined, address: data.get("direccion") || undefined,
      }) });
      if (!response.ok) { setError(await readApiError(response, "No fue posible guardar el paciente.")); return; }
      router.push("/pacientes"); router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }
  return <div>
    <div className="mb-5 flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start"><div><Link className="mb-4 inline-flex text-xs text-muted no-underline" href="/pacientes">← Volver a pacientes</Link><p className="m-0 text-xs font-extrabold uppercase tracking-[.1em] text-primary">Gestión de pacientes</p><h1 className="my-1 text-[clamp(1.8rem,3vw,2.5rem)] font-bold">Crear nuevo paciente</h1><span className="text-muted">Registra la información esencial para abrir una historia clínica.</span></div><i className="rounded-full border border-[#bce0d2] bg-[#effaf5] px-3 py-2 text-xs not-italic text-success max-sm:hidden">● Nuevo registro</i></div>
    <div className="mb-5 rounded-2xl border border-line bg-white px-4 py-3"><div className="flex justify-between text-xs text-muted"><span>Progreso del registro</span><strong>{progress}% completado</strong></div><progress className="h-2.5 w-full accent-primary" value={progress} max="100">{progress}%</progress></div>
    <div className="grid grid-cols-[minmax(0,1fr)_255px] items-start gap-5 max-[880px]:grid-cols-[minmax(0,1fr)_220px] max-sm:grid-cols-1"><form className="grid max-w-262.5 gap-4" onInput={update} onChange={update} onSubmit={submit}>
      <section className={sectionClass}><header className="flex items-start gap-3 border-b border-[#edf2f2] pb-4"><i className="grid size-9 place-items-center rounded-xl bg-primary-soft text-xs not-italic font-extrabold text-primary">01</i><div><h2 className="m-0 text-xl font-bold">Información personal</h2><p className="m-0 text-xs text-muted">Datos básicos para identificar al paciente.</p></div></header><div className={gridClass}><label className={labelClass}>Nombre completo <span className="sr-only">(obligatorio)</span><input className={fieldClass} name="nombre" autoComplete="name" placeholder="Ej. María González" required /></label><label className={labelClass}>Documento <span className="sr-only">(obligatorio)</span><input className={fieldClass} name="documento" inputMode="numeric" placeholder="Número de identificación" required /></label><label className={labelClass}>Fecha de nacimiento<input className={fieldClass} name="fechaNacimiento" type="date" /></label><label className={labelClass}>Sexo<select className={fieldClass} name="sexo" defaultValue=""><option value="">Seleccionar una opción</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label></div></section>
      <section className={sectionClass}><header className="flex items-start gap-3 border-b border-[#edf2f2] pb-4"><i className="grid size-9 place-items-center rounded-xl bg-primary-soft text-xs not-italic font-extrabold text-primary">02</i><div><h2 className="m-0 text-xl font-bold">Datos de contacto</h2><p className="m-0 text-xs text-muted">Información para recordatorios y comunicaciones.</p></div></header><div className={gridClass}><label className={labelClass}>Teléfono <span className="sr-only">(obligatorio)</span><input className={fieldClass} name="telefono" type="tel" autoComplete="tel" placeholder="+57 300 000 0000" required /></label><label className={labelClass}>Correo electrónico<input className={fieldClass} name="correo" type="email" autoComplete="email" placeholder="paciente@correo.com" /></label><label className={`${labelClass} col-span-full max-sm:col-auto`}>Dirección<input className={fieldClass} name="direccion" autoComplete="street-address" placeholder="Calle, número, ciudad" /></label></div></section>
      <div className="flex justify-end gap-2"><ButtonLink href="/pacientes" secondary>Cancelar</ButtonLink><button className={buttonClass} type="submit" disabled={saving}>{saving ? "Guardando…" : "✓ Guardar paciente"}</button></div>
      {error && <FeedbackDialog message={error} onClose={() => setError("")} title="No pudimos guardar el paciente" />}
    </form><aside className="sticky top-19 order-none rounded-[20px] border border-line bg-linear-to-br from-white to-[#eef8f7] p-5 shadow-soft max-sm:static max-sm:order-first"><i className="grid size-9.5 place-items-center rounded-xl bg-primary not-italic text-white">✦</i><h2 className="mb-2 mt-4 font-bold">Registro rápido</h2><p className="text-xs text-muted">Solo los campos marcados con asterisco son obligatorios. Podrás completar la historia clínica después.</p><ul className="my-4 list-none border-y border-line p-0 py-2">{[["Datos protegidos","Información de uso clínico"],["Perfil editable","Actualiza los datos cuando quieras"],["Historia preparada","Continúa después del registro"]].map(([title, detail]) => <li className="my-3 flex gap-2 text-success" key={title}>✓ <span className="grid text-xs text-ink"><b>{title}</b><small className="text-muted">{detail}</small></span></li>)}</ul><p className="rounded-xl bg-primary-soft p-3 text-xs">ⓘ Verifica el documento antes de guardar para evitar pacientes duplicados.</p></aside></div>
  </div>;
}
