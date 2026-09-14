"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass, cardClass, cn, secondaryButtonClass } from "./ui";

const plans = [
  { slug: "inicial", name: "Inicial", price: "$29.900/mes", features: ["Hasta 5 procesos activos", "3 integrantes", "Tareas y documentos", "Resumen semanal por correo"] },
  { slug: "equipo", name: "Equipo", price: "$79.900/mes", features: ["Procesos activos ilimitados", "Hasta 20 integrantes", "Plantillas y roles", "Reportes operativos", "Módulos especializados"] },
  { slug: "organizacion", name: "Organización", price: "A la medida", features: ["Equipos e integrantes ilimitados", "Permisos por área", "Acompañamiento de implementación", "Reportes consolidados", "Soporte prioritario"] },
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
      <div className="grid grid-cols-3 gap-5 max-[880px]:mx-auto max-[880px]:max-w-155 max-[880px]:grid-cols-1">
        {plans.map((plan, index) => {
          const isSelected = selected === plan.slug;
          return (
            <article
              className={cn(
                cardClass,
                "relative flex flex-col p-7 transition-[transform,border-color,box-shadow] duration-200",
                index === 1 && "-translate-y-3 border-2 border-primary max-[880px]:translate-y-0",
                isSelected && "border-2 border-primary ring-4 ring-primary/10",
              )}
              key={plan.name}
            >
              {isSelected && <span className="absolute right-5 top-5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-extrabold text-primary-dark">✓ Seleccionado</span>}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <p className="text-2xl font-extrabold text-primary-dark">{plan.price}</p>
              <ul className="min-h-52 flex-1 list-none p-0 text-muted">{plan.features.map((feature) => <li className="my-2.5" key={feature}>✓ {feature}</li>)}</ul>
              <button
                className={cn(isSelected ? secondaryButtonClass : buttonClass, "w-full")}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectPlan(plan.slug)}
              >
                {isSelected ? "Plan seleccionado" : `Seleccionar ${plan.name}`}
              </button>
            </article>
          );
        })}
      </div>

      {selectedPlan && <div
        className="mx-auto mt-8 grid max-w-225 grid-cols-[1fr_auto] items-center gap-5 rounded-2xl border border-primary/30 bg-primary-soft/60 p-5 max-sm:grid-cols-1"
        id="selected-plan"
        aria-live="polite"
      >
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[.08em] text-primary">Tu selección</span>
            <p className="my-1 font-bold">Plan {selectedPlan.name} · <span className="text-primary-dark">{selectedPlan.price}</span></p>
            <small className="text-muted">Podrás revisar los datos antes de completar el registro.</small>
          </div>
          <Link className={buttonClass} href={`/registro?plan=${selectedPlan.slug}`}>Continuar con este plan →</Link>
      </div>}
    </>
  );
}
