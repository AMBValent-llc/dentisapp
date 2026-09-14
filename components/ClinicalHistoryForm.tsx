"use client";

import { FormEvent, useState } from "react";
import { buttonClass, cn, fieldClass, labelClass } from "./ui";
import { FeedbackBanner, FeedbackDialog } from "./Feedback";
import { readApiError } from "@/lib/client-errors";

type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "select" | "textarea";
  options?: [string, string][];
  required?: boolean;
  full?: boolean;
  readOnly?: boolean;
};

const yesNo: [string, string][] = [["", "Seleccionar"], ["si", "Sí"], ["no", "No"]];
const personal: Field[] = [
  { name: "nombre", label: "Nombre completo del paciente", required: true },
  { name: "documento", label: "Documento", required: true },
  { name: "fechaNacimiento", label: "Fecha de nacimiento", type: "date", required: true },
  { name: "edad", label: "Edad", readOnly: true },
  { name: "direccion", label: "Dirección residencial" }, { name: "ciudad", label: "Ciudad de residencia" },
  { name: "barrio", label: "Barrio" }, { name: "correo", label: "Correo electrónico", type: "email" },
  { name: "estadoCivil", label: "Estado civil" }, { name: "ocupacion", label: "Ocupación" },
  { name: "sexo", label: "Sexo", type: "select", options: [["", "Seleccionar"], ["masculino", "Masculino"], ["femenino", "Femenino"], ["otro", "Otro"]] },
  { name: "grupoEtnico", label: "Grupo étnico" }, { name: "tipoSangre", label: "Tipo de sangre" }, { name: "profesion", label: "Profesión" },
];
const consultation: Field[] = [
  { name: "covid", label: "¿Le han indicado aislamiento preventivo por COVID-19 los últimos 15 días?", type: "select", options: yesNo, required: true, full: true },
  { name: "motivoConsulta", label: "Motivo consulta", type: "textarea", required: true, full: true },
  { name: "historiaEnfermedad", label: "Historia de la enfermedad", type: "textarea", required: true, full: true },
  { name: "presentaDolor", label: "Presenta dolor", type: "select", options: yesNo, required: true },
  { name: "escalaDolor", label: "Seleccione la escala de dolor", type: "select", required: true, options: [["", "Seleccionar"], ...Array.from({ length: 10 }, (_, index): [string, string] => { const value = String(index + 1); return [value, value === "1" ? "1 - Mínimo" : value === "5" ? "5 - Moderado" : value === "10" ? "10 - Máximo" : value]; })] },
];
const history: Field[] = [
  { name: "antecedentesPersonales", label: "Antecedentes personales", type: "textarea", required: true, full: true },
  { name: "obsAntecedentesPersonales", label: "Observación antecedentes personales", type: "textarea", full: true },
  { name: "medicacionActual", label: "Medicación actual", type: "textarea", full: true },
  { name: "antecedentesFamiliares", label: "Antecedentes familiares", type: "textarea", required: true, full: true },
  { name: "obsAntecedentesFamiliares", label: "Observación antecedentes familiares", type: "textarea", full: true },
  { name: "higieneOral", label: "Hábitos de higiene oral", required: true },
];
const examination: Field[] = [
  { name: "examenIntraoral", label: "Examen intraoral", type: "textarea", full: true },
  { name: "hallazgosClinicos", label: "Otros hallazgos clínicos", type: "textarea", full: true },
  { name: "hallazgosRadiograficos", label: "Hallazgos radiográficos", type: "textarea", full: true },
  { name: "nombreAcompanante", label: "Nombre del acompañante" }, { name: "idAcompanante", label: "N.º identificación del acompañante" },
  { name: "parentesco", label: "Parentesco acompañante" }, { name: "esAcudiente", label: "¿Es el acudiente o responsable?", type: "select", options: yesNo },
  { name: "nombreAcudiente", label: "Nombre del acudiente o responsable" }, { name: "idAcudiente", label: "N.º identificación del acudiente o responsable" },
  { name: "telefonoAcudiente", label: "N.º telefónico del acudiente o responsable", type: "tel" },
];
function FieldControl({ field, age }: { field: Field; age: string }) {
  const props = { id: field.name, name: field.name, required: field.required, readOnly: field.readOnly, "aria-required": field.required || undefined };
  return <label className={cn(labelClass, field.full && "col-span-full max-sm:col-auto")} htmlFor={field.name}>{field.label}{field.required && <span className="sr-only"> (obligatorio)</span>}
    {field.type === "textarea" ? <textarea className={`${fieldClass} min-h-28 resize-y`} {...props} /> : field.type === "select" ? <select className={fieldClass} {...props} defaultValue="">{field.options?.map(([value, label]) => <option key={`${field.name}-${value}`} value={value}>{label}</option>)}</select> : <input className={fieldClass} {...props} type={field.type ?? "text"} value={field.name === "edad" ? age : undefined} />}
  </label>;
}

export function ClinicalHistoryForm({ patients }: { patients: { id: string; fullName: string; documentNumber: string }[] }) {
  const [age, setAge] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState("");
  function calculateAge(value: string) {
    if (!value) return setAge("");
    const born = new Date(`${value}T00:00:00`);
    const today = new Date();
    let years = today.getFullYear() - born.getFullYear();
    const month = today.getMonth() - born.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < born.getDate())) years--;
    setAge(years >= 0 ? `${years} años` : "");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving"); setError("");
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    const pain = Number(values.escalaDolor);
    const payload = {
      patientId: String(values.patientId),
      consultationReason: String(values.motivoConsulta),
      currentIllness: String(values.historiaEnfermedad ?? ""),
      personalHistory: String(values.antecedentesPersonales ?? ""),
      familyHistory: String(values.antecedentesFamiliares ?? ""),
      currentMedication: String(values.medicacionActual ?? ""),
      examination: [values.examenIntraoral, values.hallazgosClinicos, values.hallazgosRadiograficos].filter(Boolean).join("\n"),
      painScale: Number.isInteger(pain) && pain >= 0 && pain <= 10 ? pain : undefined,
      metadata: { ...values, edad: age },
    };
    try {
      const response = await fetch("/api/clinical-histories", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
      if (!response.ok) {
        setState("error");
        setError(await readApiError(response, "No fue posible guardar la historia clínica."));
        return;
      }
      setState("success");
    } catch {
      setState("error");
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    }
  }
  return <form className="grid max-w-262.5 gap-4" onSubmit={submit} onChange={(event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    const target = event.target;
    if (target.name === "fechaNacimiento") calculateAge(target.value);
  }}>
    <label className={labelClass}>Paciente registrado<select className={fieldClass} name="patientId" required defaultValue=""><option value="" disabled>Selecciona un paciente</option>{patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.fullName} · {patient.documentNumber}</option>)}</select></label>
    {[["Datos personales complementarios", personal], ["Consulta actual", consultation], ["Antecedentes", history], ["Exámenes y responsables", examination]].map(([title, fields]) => <section className="rounded-[18px] border border-line bg-white p-[clamp(1.2rem,3vw,2rem)] shadow-soft" key={title as string}><h2 className="text-xl font-bold">{title as string}</h2><div className="mt-4 grid grid-cols-2 gap-4 max-sm:grid-cols-1">{(fields as Field[]).map((field) => <FieldControl key={field.name} field={field} age={age} />)}</div></section>)}
    {state === "success" && <FeedbackBanner>Historia clínica enviada correctamente.</FeedbackBanner>}
    {state === "error" && <FeedbackDialog message={error} onClose={() => { setState("idle"); setError(""); }} title="No pudimos guardar la historia clínica" />}
    <div className="flex justify-end"><button className={buttonClass} type="submit" disabled={state === "saving"}>{state === "saving" ? "Guardando…" : "Guardar historia clínica"}</button></div>
  </form>;
}
