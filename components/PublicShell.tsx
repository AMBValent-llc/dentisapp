"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "./ui";
import { AmbValentCredit } from "./AmbValentCredit";

const links = [
  { href: "/nosotros", label: "¿Quiénes somos?" },
  { href: "/planes", label: "Planes" },
  { href: "/contacto", label: "Contacto" },
];

export function PublicShell({ children, landing = false }: { children: React.ReactNode; landing?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const closeOnKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const closeOnPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (open && !menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnKey);
    document.addEventListener("pointerdown", closeOnPointer);
    return () => {
      document.removeEventListener("keydown", closeOnKey);
      document.removeEventListener("pointerdown", closeOnPointer);
    };
  }, [open]);

  return (
    <div className={cn("flex min-h-screen flex-col", landing && "overflow-x-hidden bg-[#f8fbfb]")}>
      <header className="sticky top-0 z-50 flex min-h-19 flex-wrap items-center justify-between border-b border-line/90 bg-white/90 px-[max(1.25rem,calc((100vw-1180px)/2))] py-3 backdrop-blur-xl">
        <Link className="inline-flex items-center gap-2 text-2xl font-black tracking-[-.04em] text-ink no-underline before:grid before:size-9 before:place-items-center before:rounded-[11px_11px_15px_15px] before:bg-linear-to-br before:from-primary before:to-[#36a9a9] before:text-base before:text-white before:shadow-[0_7px_16px_rgb(8_127_140/0.22)] before:content-['D']" href="/" aria-label="Docli, inicio">Docli</Link>
        <nav className="flex items-center gap-1 max-[880px]:hidden" aria-label="Navegación principal">
          {links.map((link) => <Link className="rounded-xl px-3.5 py-2.5 font-semibold text-[#405860] no-underline hover:bg-primary-soft hover:text-primary-dark aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary-dark" aria-current={pathname === link.href ? "page" : undefined} key={link.href} href={link.href}>{link.label}</Link>)}
          <Link className="ml-1 rounded-xl bg-primary px-3.5 py-2.5 font-semibold text-white no-underline hover:bg-primary-dark" aria-current={pathname === "/login" ? "page" : undefined} href="/login">Iniciar sesión</Link>
        </nav>
        <button ref={menuButtonRef} className="hidden size-11 rounded-xl border border-line bg-white p-2.5 max-[880px]:block" type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Cerrar menú de navegación" : "Abrir menú de navegación"} onClick={() => setOpen((value) => !value)}>
          <span className="my-1 block h-0.5 bg-ink" /><span className="my-1 block h-0.5 bg-ink" /><span className="my-1 block h-0.5 bg-ink" />
        </button>
        <div className={cn("hidden w-full gap-1 rounded-2xl bg-canvas p-3", open && "max-[880px]:grid")} id="mobile-menu" ref={menuRef}>
          {links.map((link) => <Link className="rounded-xl px-3.5 py-2.5 font-semibold text-[#405860] no-underline hover:bg-primary-soft" key={link.href} href={link.href}>{link.label}</Link>)}
          <Link className="rounded-xl bg-primary px-3.5 py-2.5 font-semibold text-white no-underline" href="/login">Iniciar sesión</Link>
        </div>
      </header>
      {children}
      <footer className={cn("mt-auto text-center text-sm", landing ? "grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-line bg-white px-[max(1.25rem,calc((100vw-1180px)/2))] py-6 max-sm:grid-cols-[1fr_auto] max-[480px]:grid-cols-1 max-[480px]:gap-3" : "bg-[#112b33] p-5 text-[#cbd8db]")}>
        {landing ? <>
          <Link className="text-left text-xl font-black tracking-[-.04em] no-underline max-[480px]:text-center" href="/">Docli</Link>
          <p className="text-xs text-muted max-sm:hidden">Procesos claros. Equipos coordinados.</p>
          <div className="flex flex-col items-end gap-1.5 text-xs leading-none text-muted max-[480px]:items-center"><span>© 2026 Docli</span><AmbValentCredit /></div>
        </> : <div className="grid justify-items-center gap-2"><span>© 2026 Docli. Todos los derechos reservados.</span><AmbValentCredit dark /></div>}
      </footer>
    </div>
  );
}
