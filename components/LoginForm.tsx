"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getLoginError } from "@/lib/client-errors";
import { DemoLoginCredentials, fillDemoLoginCredentials } from "@/lib/demo-login";
import { FeedbackBanner, FeedbackDialog } from "./Feedback";
import { buttonClass, fieldClass, labelClass } from "./ui";

export function LoginForm({ demoCredentials }: { demoCredentials?: DemoLoginCredentials | null }) {
  const [role, setRole] = useState<"Administración" | "Colaborador">("Administración");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (params.has("logout")) {
      setMessage("Sesión cerrada correctamente.");
      window.history.replaceState({}, "", "/login");
    }
  }, [params]);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage(""); setError("");
    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });
      if (result.error) {
        setError(getLoginError(result.error));
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }
  return <section className="rounded-3xl border border-line bg-white p-[clamp(1.4rem,4vw,2.5rem)] shadow-card">
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-[#edf3f3] p-1" role="group" aria-label="Tipo de usuario">
      {(["Administración", "Colaborador"] as const).map((tab) => <button key={tab} aria-pressed={role === tab} className={`min-h-11 rounded-lg p-3 font-bold text-muted ${role === tab ? "bg-white text-primary-dark shadow-soft" : ""}`} type="button" onClick={() => setRole(tab)}>{tab}</button>)}
    </div>
    <form className="grid gap-2" onSubmit={submit}>
      {demoCredentials && <>
        <button
          aria-describedby="demo-login-description"
          className="min-h-11 rounded-xl border border-primary/20 bg-primary-soft px-3 text-sm font-extrabold text-primary-dark transition hover:border-primary/40 hover:bg-[#d8eeee]"
          type="button"
          onClick={() => {
            const values = fillDemoLoginCredentials(demoCredentials);
            setEmail(values.email);
            setPassword(values.password);
            setError("");
          }}
        >
          Completar cuenta de prueba
        </button>
        <p className="mb-2 text-center text-xs text-muted" id="demo-login-description" role="status">
          Cuenta demo local provisionada. Completa ambos campos y luego inicia sesión.
        </p>
      </>}
      <label className={labelClass} htmlFor="correo">Correo</label><input className={fieldClass} type="email" id="correo" name="correo" autoComplete="email" placeholder="Digite su correo" required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} />
      <label className={labelClass} htmlFor="contrasena">Contraseña</label>
      <div className="relative">
        <input className={`${fieldClass} pr-20`} type={showPassword ? "text" : "password"} id="contrasena" name="contrasena" autoComplete="current-password" placeholder="Digite su contraseña" required value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} />
        <button className="absolute inset-y-0 right-3 text-xs font-extrabold text-primary-dark" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? "Ocultar" : "Mostrar"}</button>
      </div>
      <button className={`${buttonClass} mt-3`} type="submit" disabled={loading}>{loading ? "Ingresando…" : `Ingresar como ${role.toLowerCase()}`}</button>
      <Link className="mt-1 inline-flex min-h-11 items-center justify-center text-center text-sm text-muted" href="/contacto">Recuperar contraseña</Link><p className="m-1 text-center text-sm text-muted">¿No tienes una cuenta aún?</p><Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-soft font-extrabold text-primary-dark no-underline transition hover:bg-[#d8eeee]" href="/registro">Crear una cuenta</Link>
    </form>
    {message && <div className="mt-4"><FeedbackBanner>{message}</FeedbackBanner></div>}
    {error && <FeedbackDialog message={error} onClose={() => setError("")} title="No pudimos iniciar sesión" />}
  </section>;
}
