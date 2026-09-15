"use client";

import { useEffect, useRef } from "react";

export function FeedbackDialog({
  message,
  onClose,
  title = "No pudimos completar la acción",
}: {
  message: string;
  onClose: () => void;
  title?: string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-100 grid place-items-center bg-[#0e232a]/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="w-full max-w-100 rounded-2xl border border-white/60 bg-white p-5 shadow-[0_30px_80px_rgb(14_35_42/0.28)]" role="alertdialog" aria-modal="true" aria-labelledby="feedback-error-title" aria-describedby="feedback-error-message">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-lg font-black text-danger" aria-hidden="true">!</span>
          <div className="min-w-0 pt-0.5">
            <h2 className="m-0 text-lg font-bold" id="feedback-error-title">{title}</h2>
            <p className="mb-0 mt-1 text-sm leading-5 text-muted" id="feedback-error-message">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button ref={closeRef} className="min-h-11 rounded-xl bg-ink px-4 py-2 text-sm font-extrabold text-white transition hover:bg-primary-dark" type="button" onClick={onClose}>Entendido</button>
        </div>
      </section>
    </div>
  );
}

export function FeedbackBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#bce0d2] bg-[#effaf5] px-4 py-3 text-sm text-success" role="status">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-xs font-black text-white" aria-hidden="true">✓</span>
      <span>{children}</span>
    </div>
  );
}
