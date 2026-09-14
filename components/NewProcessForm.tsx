"use client";

import { FormEvent, useState } from "react";
import { buttonClass, fieldClass, labelClass, secondaryButtonClass } from "./ui";
import { useRouter } from "next/navigation";
import { FeedbackDialog } from "./Feedback";
import { readApiError } from "@/lib/client-errors";

export function NewProcessForm() {
  const [steps, setSteps] = useState(["Recibir solicitud", "Validar información"]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/processes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: data.get("nombre"), area: data.get("area"), ownerName: data.get("responsable"),
        description: data.get("objetivo"), priority: ({ Alta: "HIGH", Media: "MEDIUM", Baja: "LOW" } as Record<string, string>)[String(data.get("prioridad"))], steps,
      }) });
      if (!response.ok) { setError(await readApiError(response, "No fue posible guardar el proceso.")); return; }
      router.push("/procesos"); router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }
  return <form className="grid max-w-230 gap-5" onSubmit={submit}>
    <section className="rounded-[18px] border border-line bg-white p-[clamp(1.2rem,3vw,2rem)] shadow-soft"><div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
      <label className={`${labelClass} col-span-2 max-sm:col-auto`}>Nombre del proceso<input className={fieldClass} name="nombre" placeholder="Ej. Incorporación de nuevos clientes" required /></label>
      <label className={labelClass}>Área<select className={fieldClass} name="area" defaultValue=""><option value="" disabled>Selecciona un área</option><option>Operaciones</option><option>Servicio</option><option>Legal</option><option>Administración</option><option>Salud</option><option>Otra</option></select></label>
      <label className={labelClass}>Responsable<input className={fieldClass} name="responsable" placeholder="Nombre o equipo" required /></label>
      <label className={`${labelClass} col-span-2 max-sm:col-auto`}>Objetivo<textarea className={`${fieldClass} min-h-24 resize-y`} name="objetivo" placeholder="Describe el resultado observable que debe producir este proceso." required /></label>
      <label className={labelClass}>Prioridad<select className={fieldClass} name="prioridad" defaultValue="Media"><option>Alta</option><option>Media</option><option>Baja</option></select></label>
    </div></section>
    <section className="rounded-[18px] border border-line bg-white p-[clamp(1.2rem,3vw,2rem)] shadow-soft"><div className="flex items-start justify-between gap-4"><div><h2 className="m-0 text-xl font-bold">Pasos iniciales</h2><p className="mt-1 text-sm text-muted">Crea una primera versión. Podrás definir responsables y criterios después.</p></div><span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">{steps.length} pasos</span></div><ol className="grid gap-3 p-0">{steps.map((step,index) => <li className="grid list-none grid-cols-[32px_1fr_auto] items-center gap-2" key={index}><span className="grid size-8 place-items-center rounded-lg bg-[#edf3f3] text-xs font-bold">{index + 1}</span><input className={fieldClass} aria-label={`Paso ${index + 1}`} value={step} onChange={(event) => setSteps((current) => current.map((item,itemIndex) => itemIndex === index ? event.target.value : item))} required /><button className="rounded-lg px-2 py-2 text-danger disabled:opacity-30" type="button" disabled={steps.length === 1} aria-label={`Eliminar paso ${index + 1}`} onClick={() => setSteps((current) => current.filter((_,itemIndex) => itemIndex !== index))}>Eliminar</button></li>)}</ol><button className={secondaryButtonClass} type="button" onClick={() => setSteps((current) => [...current, ""])}>＋ Añadir paso</button></section>
    <div className="flex flex-wrap items-center justify-end gap-3"><span className="mr-auto text-sm text-muted">Se guardará como borrador.</span><button className={secondaryButtonClass} type="reset" onClick={() => { setSteps(["Recibir solicitud", "Validar información"]); setError(""); }}>Limpiar</button><button className={buttonClass} type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar proceso"}</button></div>
    {error && <FeedbackDialog message={error} onClose={() => setError("")} title="No pudimos guardar el proceso" />}
  </form>;
}
