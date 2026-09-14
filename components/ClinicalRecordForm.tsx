"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/components/ui";
import { FeedbackBanner, FeedbackDialog } from "@/components/Feedback";
import { readApiError } from "@/lib/client-errors";

type Kind = "consents" | "referrals" | "exams";
export function ClinicalRecordForm({ kind, patients }: { kind: Kind; patients: { id: string; fullName: string }[] }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    const data = new FormData(event.currentTarget);
    const common = { patientId: data.get("patientId") };
    const payload = kind === "consents" ? { ...common, title: data.get("title"), body: data.get("detail") }
      : kind === "referrals" ? { ...common, specialty: data.get("title"), reason: data.get("detail") }
      : { ...common, name: data.get("title"), notes: data.get("detail") };
    try {
      const response = await fetch(`/api/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) { setError(await readApiError(response, "No fue posible guardar el registro.")); return; }
      event.currentTarget.reset(); setMessage("Registro guardado."); router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }
  return <form className="mb-5 grid grid-cols-[1fr_1fr_2fr_auto] items-end gap-3 rounded-2xl border border-line bg-white p-4 max-[1050px]:grid-cols-2 max-sm:grid-cols-1" onSubmit={submit}>
    <label className={labelClass}>Paciente<select className={fieldClass} name="patientId" required defaultValue=""><option value="" disabled>Seleccionar</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select></label>
    <label className={labelClass}>{kind === "consents" ? "Título" : kind === "referrals" ? "Especialidad" : "Examen"}<input className={fieldClass} name="title" required /></label>
    <label className={labelClass}>{kind === "referrals" ? "Motivo" : "Detalle"}<input className={fieldClass} name="detail" required /></label>
    <button className={buttonClass} type="submit" disabled={saving}>{saving ? "Guardando…" : "Crear"}</button>
    {message && <div className="col-span-full"><FeedbackBanner>{message}</FeedbackBanner></div>}
    {error && <FeedbackDialog message={error} onClose={() => setError("")} title="No pudimos guardar el registro" />}
  </form>;
}
