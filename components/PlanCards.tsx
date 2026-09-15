"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { buttonClass, cardClass, cn } from "./ui";

const plans = [
  { slug: "inicial", name: "Inicial", price: "$29.900/mes", features: ["Hasta 5 procesos activos", "3 integrantes", "Tareas y documentos", "Resumen semanal por correo"], disabled: false },
  { slug: "equipo", name: "Equipo", price: "$79.900/mes", features: ["Procesos activos ilimitados", "Hasta 20 integrantes", "Plantillas y roles", "Reportes operativos", "Módulos especializados"], recommended: true, disabled: false },
  { slug: "organizacion", name: "Organización", price: "A la medida", features: ["Equipos e integrantes ilimitados", "Permisos por área", "Acompañamiento de implementación", "Reportes consolidados", "Soporte prioritario"], disabled: false },
];

export function PlanCards() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedPlan = plans.find((plan) => plan.slug === selected);

  useEffect(() => {
    const savedPlan = sessionStorage.getItem("docli.plan");
    if (plans.some((plan) => plan.slug === savedPlan)) setSelected(savedPlan);
  }, []);

  function selectPlan(slug: string) {
    setSelected(slug);
    sessionStorage.setItem("docli.plan", slug);
  }

  return (
    <>
      <fieldset>
        <legend className="sr-only">Selecciona un plan</legend>
        <div className="grid grid-cols-3 items-stretch gap-5 max-[880px]:mx-auto max-[880px]:max-w-155 max-[880px]:grid-cols-1">
          {plans.map((plan) => {
            const isSelected = selected === plan.slug;
            return (
              <label className={cn("group relative block h-full", plan.disabled ? "cursor-not-allowed" : "cursor-pointer")} key={plan.name}>
                <input
                  className="peer sr-only"
                  type="radio"
                  name="plan"
                  value={plan.slug}
                  aria-label={`Plan ${plan.name}, ${plan.price}${plan.recommended ? ", más popular" : ""}`}
                  checked={isSelected}
                  disabled={plan.disabled}
                  onChange={() => selectPlan(plan.slug)}
                />
                <span
                  className={cn(
                    cardClass,
                    "flex h-full flex-col p-7 transition-[border-color,box-shadow,background-color] duration-200",
                    "group-hover:border-primary/50 group-hover:shadow-lg",
                    "peer-focus-visible:border-primary peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20",
                    "peer-checked:border-primary peer-checked:bg-primary-soft/20 peer-checked:ring-2 peer-checked:ring-primary/15",
                    "peer-disabled:border-line peer-disabled:bg-slate-50 peer-disabled:opacity-60 peer-disabled:shadow-none",
                  )}
                >
                  <span className="mb-3 flex min-h-6 items-center">
                    {plan.recommended && <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-extrabold text-primary-dark">Más popular</span>}
                  </span>
                  <span className="text-xl font-bold">{plan.name}</span>
                  <span className="mt-1 text-2xl font-extrabold text-primary-dark">{plan.price}</span>
                  <span className="sr-only">{isSelected ? "Plan seleccionado." : ""}</span>
                  <ul className="my-5 flex-1 list-none p-0 text-muted">
                    {plan.features.map((feature) => <li className="my-2.5" key={feature}>✓ {feature}</li>)}
                  </ul>
                  <span className={cn("flex min-h-11.5 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-extrabold transition-colors", isSelected ? "border-primary bg-primary text-white" : "border-line bg-white text-ink group-hover:border-primary/40 group-hover:bg-primary-soft group-hover:text-primary-dark")}>
                    <span className={cn("grid size-5 place-items-center rounded-full border-2", isSelected ? "border-white" : "border-muted/60")} aria-hidden="true">
                      {isSelected && <span className="size-2.5 rounded-full bg-white" />}
                    </span>
                    {isSelected ? "Plan seleccionado" : `Seleccionar ${plan.name}`}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div
        className="mx-auto mt-8 grid min-h-28 max-w-225 grid-cols-[1fr_auto] items-center gap-5 rounded-2xl border border-primary/30 bg-primary-soft/60 p-5 max-sm:grid-cols-1"
        id="selected-plan"
      >
        <div aria-live="polite">
          <span className="text-xs font-extrabold uppercase tracking-[.08em] text-primary">{selectedPlan ? "Tu selección" : "Siguiente paso"}</span>
          <p className="my-1 font-bold">
            {selectedPlan ? <>Plan {selectedPlan.name} · <span className="text-primary-dark">{selectedPlan.price}</span></> : "Selecciona un plan para continuar"}
          </p>
          <small className="text-muted">{selectedPlan ? "Podrás revisar los datos antes de completar el registro." : "Puedes cambiar tu elección antes de crear la cuenta."}</small>
        </div>
        {selectedPlan
          ? <Link className={buttonClass} href={`/registro?plan=${selectedPlan.slug}`}>Continuar con {selectedPlan.name} →</Link>
          : <button className={cn(buttonClass, "max-sm:w-full disabled:!cursor-not-allowed disabled:!opacity-55")} type="button" disabled>Continuar →</button>}
      </div>
    </>
  );
}
