"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass, secondaryButtonClass } from "./ui";
import { authClient } from "@/lib/auth-client";
import { getSpanishError, readApiError } from "@/lib/client-errors";
import { FeedbackDialog } from "./Feedback";

type RegistrationData = {
  organization: string;
  sector: string;
  teamSize: string;
  name: string;
  email: string;
  password: string;
  confirmation: string;
  terms: boolean;
};

const initialData: RegistrationData = {
  organization: "",
  sector: "",
  teamSize: "",
  name: "",
  email: "",
  password: "",
  confirmation: "",
  terms: false,
};

export function RegistrationForm({ selectedPlan, existingSession = false }: { selectedPlan?: string; existingSession?: boolean }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [data, setData] = useState(initialData);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordStrength = useMemo(() => {
    if (!data.password) return 0;
    return [
      data.password.length >= 8,
      /[A-Z]/.test(data.password),
      /\d/.test(data.password),
      /[^A-Za-z0-9]/.test(data.password),
    ].filter(Boolean).length;
  }, [data.password]);

  function update<K extends keyof RegistrationData>(field: K, value: RegistrationData[K]) {
    setData((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function continueRegistration() {
    if (!data.organization.trim() || !data.sector || !data.teamSize) {
      setError("Completa los datos del equipo para continuar.");
      return;
    }
    setStep(2);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data.name.trim() || !data.email.trim() || !data.password) {
      setError("Completa los datos de acceso.");
      return;
    }
    if (data.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (data.password !== data.confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!data.terms) {
      setError("Debes aceptar los términos y la política de privacidad.");
      return;
    }

    setLoading(true); setDialogError("");
    try {
      if (!existingSession) {
        const signup = await authClient.signUp.email({ name: data.name.trim(), email: data.email.trim().toLowerCase(), password: data.password });
        if (signup.error) {
          setDialogError(getSpanishError(signup.error.message, "No fue posible crear la cuenta. Revisa los datos e inténtalo nuevamente."));
          return;
        }
      }
      const response = await fetch("/api/workspaces", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.organization, sector: data.sector, teamSize: data.teamSize, plan: selectedPlan ?? "inicial" }),
      });
      if (!response.ok) {
        setDialogError(await readApiError(response, "La cuenta fue creada, pero no fue posible configurar el equipo. Inicia sesión para volver a intentarlo."));
        return;
      }
      router.replace("/dashboard?welcome=1");
      router.refresh();
    } catch {
      setDialogError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const strengthLabels = ["Muy débil", "Débil", "Aceptable", "Segura", "Muy segura"];
  const strengthColors = ["bg-line", "bg-danger", "bg-warning", "bg-primary", "bg-success"];

  return (
    <section className="rounded-3xl border border-line bg-white p-[clamp(1.4rem,4vw,2.5rem)] shadow-card">
      <div className="mb-7 flex items-center gap-3" aria-label={`Paso ${step} de 2`}>
        {[1, 2].map((item) => (
          <div className="flex flex-1 items-center gap-2" key={item}>
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${item <= step ? "bg-primary text-white" : "bg-canvas text-muted"}`}>{item}</span>
            <span className={`text-xs font-bold ${item <= step ? "text-ink" : "text-muted"}`}>{item === 1 ? "Tu equipo" : "Tu acceso"}</span>
            {item === 1 && <i className={`ml-auto h-px flex-1 ${step === 2 ? "bg-primary" : "bg-line"}`} aria-hidden="true" />}
          </div>
        ))}
      </div>

      <form onSubmit={submit}>
        {selectedPlan && <div className="mb-5 flex items-center justify-between rounded-xl border border-primary/20 bg-primary-soft px-4 py-3 text-sm"><span>Plan seleccionado</span><strong className="capitalize text-primary-dark">{selectedPlan}</strong></div>}
        {step === 1 ? (
          <div className="grid gap-4">
            <div>
              <h2 className="m-0 text-2xl font-bold">Crea tu espacio de trabajo</h2>
              <p className="mb-5 mt-2 text-sm text-muted">Configura el lugar donde tu equipo organizará procesos, tareas y documentos.</p>
            </div>
            <label className={labelClass} htmlFor="organization">
              Nombre del equipo u organización
              <input className={fieldClass} id="organization" autoComplete="organization" placeholder="Ej. Operaciones Norte" value={data.organization} onChange={(event) => update("organization", event.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              <label className={labelClass} htmlFor="sector">
                Sector
                <select className={fieldClass} id="sector" value={data.sector} onChange={(event) => update("sector", event.target.value)}>
                  <option value="">Seleccionar</option>
                  <option>Servicios</option>
                  <option>Operaciones</option>
                  <option>Legal</option>
                  <option>Administración y finanzas</option>
                  <option>Salud</option>
                  <option>Tecnología</option>
                  <option>Otro</option>
                </select>
              </label>
              <label className={labelClass} htmlFor="team-size">
                Tamaño del equipo
                <select className={fieldClass} id="team-size" value={data.teamSize} onChange={(event) => update("teamSize", event.target.value)}>
                  <option value="">Seleccionar</option>
                  <option>Solo yo</option>
                  <option>2 a 10 personas</option>
                  <option>11 a 50 personas</option>
                  <option>Más de 50 personas</option>
                </select>
              </label>
            </div>
            {error && <p className="m-0 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-danger" role="alert">{error}</p>}
            <button className={buttonClass} type="button" onClick={continueRegistration}>Continuar →</button>
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <h2 className="m-0 text-2xl font-bold">Crea tus datos de acceso</h2>
              <p className="mb-5 mt-2 text-sm text-muted">Serás la persona administradora del espacio <strong className="text-ink">{data.organization}</strong>.</p>
            </div>
            <label className={labelClass} htmlFor="name">
              Nombre completo
              <input className={fieldClass} id="name" autoComplete="name" placeholder="Tu nombre" value={data.name} onChange={(event) => update("name", event.target.value)} />
            </label>
            <label className={labelClass} htmlFor="email">
              Correo de trabajo
              <input className={fieldClass} id="email" type="email" autoComplete="email" placeholder="nombre@empresa.com" value={data.email} onChange={(event) => update("email", event.target.value)} />
            </label>
            <label className={labelClass} htmlFor="password">
              Contraseña
              <span className="relative">
                <input className={`${fieldClass} pr-18`} id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={data.password} onChange={(event) => update("password", event.target.value)} />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary" type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Ocultar" : "Mostrar"}</button>
              </span>
            </label>
            <div>
              <div className="grid grid-cols-4 gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((level) => <span className={`h-1 rounded-full ${level <= passwordStrength ? strengthColors[passwordStrength] : "bg-line"}`} key={level} />)}
              </div>
              <p className="mb-0 mt-1 text-xs text-muted">Seguridad: {strengthLabels[passwordStrength]}</p>
            </div>
            <label className={labelClass} htmlFor="confirmation">
              Confirmar contraseña
              <input className={fieldClass} id="confirmation" type="password" autoComplete="new-password" placeholder="Repite tu contraseña" value={data.confirmation} onChange={(event) => update("confirmation", event.target.value)} />
            </label>
            <label className="flex items-start gap-3 text-sm text-muted">
              <input className="mt-1 size-4 accent-primary" type="checkbox" checked={data.terms} onChange={(event) => update("terms", event.target.checked)} />
              <span>Acepto los términos de uso y el tratamiento de datos de Docli.</span>
            </label>
            {error && <p className="m-0 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-danger" role="alert">{error}</p>}
            <div className="grid grid-cols-[auto_1fr] gap-2 max-sm:grid-cols-1">
              <button className={secondaryButtonClass} type="button" onClick={() => { setStep(1); setError(""); }}>Atrás</button>
              <button className={buttonClass} type="submit" disabled={loading}>{loading ? "Creando espacio…" : "Crear mi espacio"}</button>
            </div>
          </div>
        )}
      </form>

      <p className="mb-0 mt-6 text-center text-sm text-muted">¿Ya tienes una cuenta? <Link className="font-bold text-primary-dark" href="/login">Inicia sesión</Link></p>
      {dialogError && <FeedbackDialog message={dialogError} onClose={() => setDialogError("")} title="No pudimos completar el registro" />}
    </section>
  );
}
