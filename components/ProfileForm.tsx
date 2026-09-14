"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getSpanishError, readApiError } from "@/lib/client-errors";
import { FeedbackBanner, FeedbackDialog } from "./Feedback";
import { buttonClass, fieldClass, labelClass } from "./ui";

const sectionClass = "rounded-[18px] border border-line bg-white p-[clamp(1.2rem,3vw,2rem)] shadow-soft";
const gridClass = "mt-4 grid grid-cols-2 gap-4 max-sm:grid-cols-1";

type Profile = { name: string; email: string; phone: string | null; role: string; organizationName: string; sector: string | null; timezone: string };
export function ProfileForm({ profile }: { profile: Profile }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setError(""); const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("nombre"), phone: data.get("telefono") || null, organizationName: data.get("equipo"), sector: data.get("area") || null, timezone: data.get("zona") }) });
      if (!response.ok) { setError(await readApiError(response, "No fue posible guardar los cambios.")); return; }
      setMessage("Cambios guardados."); router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    }
  }
  async function logout() {
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(getSpanishError(result.error.message, "No fue posible cerrar la sesión. Inténtalo nuevamente."));
        return;
      }
      router.replace("/login?logout=1"); router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    }
  }
  return <form className="grid max-w-262.5 gap-4" onSubmit={save}>
    <section className={sectionClass}><h2 className="text-xl font-bold">Información personal</h2><div className={gridClass}><label className={labelClass}>Nombre completo<input className={fieldClass} name="nombre" defaultValue={profile.name} autoComplete="name" /></label><label className={labelClass}>Rol<input className={fieldClass} value={profile.role} readOnly /></label><label className={labelClass}>Correo<input className={fieldClass} type="email" value={profile.email} readOnly /></label><label className={labelClass}>Teléfono<input className={fieldClass} name="telefono" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" /></label></div></section>
    <section className={sectionClass}><h2 className="text-xl font-bold">Equipo</h2><div className={gridClass}><label className={labelClass}>Espacio de trabajo<input className={fieldClass} name="equipo" defaultValue={profile.organizationName} /></label><label className={labelClass}>Área principal<input className={fieldClass} name="area" defaultValue={profile.sector ?? ""} /></label><label className={`${labelClass} col-span-2 max-sm:col-auto`}>Zona horaria<select className={fieldClass} name="zona" defaultValue={profile.timezone}><option value="America/Bogota">Bogotá (UTC−5)</option><option value="America/Mexico_City">Ciudad de México (UTC−6)</option><option value="America/Santiago">Santiago</option></select></label></div></section>
    <section className={`${sectionClass} flex items-center justify-between border-[#f0d5d1] max-sm:flex-col max-sm:items-stretch max-sm:gap-4`}><div><h2 className="text-xl font-bold">Sesión y seguridad</h2><p className="text-muted">Cierra tu sesión de forma segura en este dispositivo.</p></div><button className="rounded-xl border border-[#e8beba] bg-white px-3.5 py-2.5 font-extrabold text-danger" type="button" onClick={logout}>↪ Cerrar sesión</button></section>
    <div className="flex justify-end"><button className={buttonClass} type="submit">Guardar cambios</button></div>{message && <FeedbackBanner>{message}</FeedbackBanner>}{error && <FeedbackDialog message={error} onClose={() => setError("")} />}
  </form>;
}
