"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FeedbackDialog } from "./Feedback";
import { readApiError } from "@/lib/client-errors";

export function TaskStatusButton({ id, done }: { id: string; done: boolean }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  async function toggle() {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: done ? "TODO" : "DONE", progress: done ? 0 : 100 }) });
      if (!response.ok) { setError(await readApiError(response, "No fue posible actualizar la tarea.")); return; }
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }
  return <><button className="mt-3 text-xs font-bold text-primary disabled:opacity-50" type="button" disabled={saving} onClick={toggle}>{saving ? "Guardando…" : done ? "Reabrir" : "Marcar completada"}</button>{error && <FeedbackDialog message={error} onClose={() => setError("")} title="No pudimos actualizar la tarea" />}</>;
}
