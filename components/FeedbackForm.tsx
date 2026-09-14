"use client";

import { FormEvent, useEffect, useState } from "react";
import { readApiError } from "@/lib/client-errors";
import { FeedbackBanner, FeedbackDialog } from "./Feedback";

export function FeedbackForm({ children, message, className }: { children: React.ReactNode; message: string; className?: string }) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setFeedback(""); setError("");
    const form = event.currentTarget; const data = new FormData(form);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("nombre"), email: data.get("correo"), company: data.get("organizacion"), message: `${data.get("motivo")}: ${data.get("mensaje")}` }) });
      if (response.ok) { setFeedback(message); form.reset(); }
      else setError(await readApiError(response, "No fue posible enviar la consulta. Revisa los campos e inténtalo nuevamente."));
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }
  return <><form className={className} onSubmit={submit} aria-busy={loading}>{children}</form>{feedback && <div className="mt-4"><FeedbackBanner>{feedback}</FeedbackBanner></div>}{error && <FeedbackDialog message={error} onClose={() => setError("")} title="No pudimos enviar tu consulta" />}</>;
}
