"use client";

import Image from "next/image";
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

const legalLinks = [
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos", label: "Términos" },
];

export function PublicShell({ children, landing = false }: { children: React.ReactNode; landing?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!landing) return;
    const updateHeader = () => setScrolled(window.scrollY > 20);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, [landing]);
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

  const elevatedHeader = !landing || scrolled;

  return (
    <div className={cn("flex min-h-screen flex-col", landing && "overflow-x-hidden bg-[#f8fbfb]")}>
      <a className="fixed left-4 top-3 z-100 -translate-y-24 rounded-xl bg-white px-4 py-3 font-bold text-primary-dark shadow-card transition-transform focus:translate-y-0 motion-reduce:transition-none" href="#main-content">Saltar al contenido principal</a>
      <header className={cn("fixed inset-x-0 top-0 z-50 flex min-h-16 flex-wrap items-center justify-between border-b px-[max(1.25rem,calc((100vw-1180px)/2))] py-2.5 transition-all duration-300 motion-reduce:transition-none", elevatedHeader ? "border-line/90 bg-white shadow-sm" : "border-transparent bg-linear-to-r from-[#075e68] via-[#08717d] to-primary")}>
        <Link className={cn("inline-flex min-h-11 items-center gap-2 text-2xl font-black tracking-[-.04em] no-underline transition-colors duration-300 motion-reduce:transition-none", elevatedHeader ? "text-primary" : "text-white")} href="/" aria-label="Docli, inicio">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white p-0.5 shadow-sm ring-1 ring-black/5" aria-hidden="true">
            <Image className="size-full object-contain" src="/docli-isotipo.png" width={40} height={40} alt="" priority />
          </span>
          Docli
        </Link>
        <nav className="flex items-center gap-1 max-[880px]:hidden" aria-label="Navegación principal">
          {links.map((link) => <Link className={cn("rounded-xl px-3.5 py-2.5 font-semibold no-underline transition-colors duration-300 motion-reduce:transition-none", elevatedHeader ? "text-[#405860] hover:bg-primary-soft hover:text-primary-dark aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary-dark" : "text-white/90 hover:bg-white/12 hover:text-white aria-[current=page]:bg-white/15 aria-[current=page]:text-white")} aria-current={pathname === link.href ? "page" : undefined} key={link.href} href={link.href}>{link.label}</Link>)}
          <Link className={cn("ml-1 rounded-xl px-3.5 py-2.5 font-semibold no-underline transition-all duration-300 motion-reduce:transition-none", elevatedHeader ? "bg-primary text-white hover:bg-primary-dark" : "bg-white text-primary-dark shadow-sm hover:-translate-y-0.5 hover:bg-primary-soft")} aria-current={pathname === "/login" ? "page" : undefined} href="/login">Iniciar sesión</Link>
        </nav>
        <button ref={menuButtonRef} className={cn("hidden size-11 rounded-xl border p-2.5 transition-colors duration-300 motion-reduce:transition-none max-[880px]:block", elevatedHeader ? "border-line bg-white" : "border-white/25 bg-white/10 hover:bg-white/15")} type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Cerrar menú de navegación" : "Abrir menú de navegación"} onClick={() => setOpen((value) => !value)}>
          <span className={cn("my-1 block h-0.5 transition-colors", elevatedHeader ? "bg-ink" : "bg-white")} /><span className={cn("my-1 block h-0.5 transition-colors", elevatedHeader ? "bg-ink" : "bg-white")} /><span className={cn("my-1 block h-0.5 transition-colors", elevatedHeader ? "bg-ink" : "bg-white")} />
        </button>
        <nav className={cn("hidden w-full gap-1 rounded-2xl border border-line bg-white p-3 shadow-card", open && "max-[880px]:grid")} id="mobile-menu" ref={menuRef} aria-label="Navegación móvil">
          {links.map((link) => <Link className="flex min-h-11 items-center rounded-xl px-3.5 py-2.5 font-semibold text-[#405860] no-underline hover:bg-primary-soft" aria-current={pathname === link.href ? "page" : undefined} key={link.href} href={link.href}>{link.label}</Link>)}
          <Link className="flex min-h-11 items-center rounded-xl bg-primary px-3.5 py-2.5 font-semibold text-white no-underline" aria-current={pathname === "/login" ? "page" : undefined} href="/login">Iniciar sesión</Link>
        </nav>
      </header>
      <div className={cn("h-16 shrink-0", landing && "bg-linear-to-r from-[#075e68] via-[#08717d] to-primary")} aria-hidden="true" />
      {children}
      <footer className="mt-auto border-t border-line bg-white px-[max(1.25rem,calc((100vw-1180px)/2))] py-5 text-sm">
        <div className="mx-auto flex max-w-295 flex-wrap items-center justify-between gap-x-10 gap-y-3 max-[480px]:justify-center">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 max-[480px]:justify-center">
            <Link className="inline-flex min-h-11 items-center text-xl font-black tracking-[-.04em] text-primary no-underline" href="/" aria-label="Docli, inicio">Docli</Link>
            <nav className="flex items-center gap-1" aria-label="Información legal">
              {legalLinks.map((link) => (
                <Link className="rounded-lg px-2.5 py-2 font-semibold text-muted no-underline transition-colors hover:bg-primary-soft hover:text-primary-dark motion-reduce:transition-none" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-xs text-muted max-[480px]:justify-center">
            <span>© 2026 Docli</span>
            <AmbValentCredit />
          </div>
        </div>
      </footer>
    </div>
  );
}
