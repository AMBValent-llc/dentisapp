"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass } from "@/components/ui";
import { FeedbackBanner, FeedbackDialog } from "@/components/Feedback";
import { readApiError } from "@/lib/client-errors";
export function DocumentForm() {
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setError(""); const form = event.currentTarget; const data = new FormData(form);
    try {
      const response = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), category: data.get("category") || undefined, externalUrl: data.get("url") || undefined }) });
      if (response.ok) { form.reset(); setMessage("Referencia añadida."); router.refresh(); }
      else setError(await readApiError(response, "No fue posible guardar el documento."));
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    }
  }
  return <form className="mb-4 grid grid-cols-[1fr_180px_1fr_auto] gap-3 max-sm:grid-cols-1" onSubmit={submit}><input className={fieldClass} name="name" placeholder="Nombre del documento" required /><input className={fieldClass} name="category" placeholder="Categoría" /><input className={fieldClass} name="url" type="url" placeholder="Enlace externo (opcional)" /><button className={buttonClass}>Añadir referencia</button>{message && <div className="col-span-full"><FeedbackBanner>{message}</FeedbackBanner></div>}{error && <FeedbackDialog message={error} onClose={() => setError("")} title="No pudimos guardar el documento" />}</form>;
}
