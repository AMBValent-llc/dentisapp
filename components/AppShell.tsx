"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { cn } from "./ui";
import { authClient } from "@/lib/auth-client";
import { FeedbackDialog } from "./Feedback";
import { getSpanishError } from "@/lib/client-errors";
import { AmbValentCredit } from "./AmbValentCredit";

const sections = [
  { title: "Operaciones", links: [
    { href: "/dashboard", icon: "▦", label: "Dashboard" },
    { href: "/procesos", icon: "◎", label: "Procesos" },
    { href: "/tareas", icon: "✓", label: "Tareas" },
    { href: "/documentos", icon: "▤", label: "Documentos" },
    { href: "/reportes", icon: "↗", label: "Reportes" },
  ] },
  { title: "Módulos clínicos", links: [
    { href: "/pacientes", icon: "◉", label: "Pacientes" },
    { href: "/pacientes/nuevo", icon: "＋", label: "Nuevo paciente" },
    { href: "/historia-clinica", icon: "▧", label: "Historia clínica" },
    { href: "/consentimientos", icon: "✓", label: "Consentimientos" },
    { href: "/remisiones", icon: "↗", label: "Remisiones" },
    { href: "/examenes", icon: "↑", label: "Exámenes" },
  ] },
];

const roleLabels: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  MEMBER: "Colaborador",
};

export function AppShell({ children, userName, organizationName, role }: { children: React.ReactNode; userName: string; organizationName: string; role: string }) {
  const [sidebar, setSidebar] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [logout, setLogout] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const asideRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSidebar(false), [pathname]);
  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (sidebar && !asideRef.current?.contains(target) && !toggleRef.current?.contains(target)) setSidebar(false);
      if (notifications && !notificationsRef.current?.contains(target)) setNotifications(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (sidebar) { setSidebar(false); toggleRef.current?.focus(); }
      setNotifications(false);
      setLogout(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [notifications, sidebar]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("query") ?? "").trim();
    if (!query) return setToast("Escribe el nombre de un proceso o una tarea.");
    router.push(`/procesos?q=${encodeURIComponent(query)}`);
  }
  async function confirmLogout() {
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setLogout(false);
        setError(getSpanishError(result.error.message, "No fue posible cerrar la sesión. Inténtalo nuevamente."));
        return;
      }
      router.replace("/login?logout=1"); router.refresh();
    } catch {
      setLogout(false);
      setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    }
  }
  const initials = userName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const roleLabel = roleLabels[role] ?? "Miembro";

  return <div className="flex min-h-screen flex-col">
    <header className="sticky top-0 z-40 h-14.5 border-b border-line bg-white/90 backdrop-blur-xl">
      <nav className="flex h-full items-center justify-between gap-4 px-4 max-sm:gap-2 max-sm:px-2.5" aria-label="Barra principal">
        <button ref={toggleRef} className="hidden size-9.5 rounded-xl border border-line bg-white max-[880px]:block" type="button" aria-controls="app-sidebar" aria-expanded={sidebar} aria-label={sidebar ? "Cerrar navegación" : "Abrir navegación"} onClick={() => setSidebar((value) => !value)}>☰</button>
        <Link className="inline-flex items-center gap-2 text-lg font-black no-underline before:grid before:size-7.5 before:place-items-center before:rounded-lg before:bg-primary before:text-xs before:text-white before:content-['D'] max-[880px]:text-[0]" href="/dashboard">Docli</Link>
        <form className="flex h-9.5 w-[min(440px,45vw)] rounded-xl bg-[#f2f6f6] p-0.5 max-[880px]:flex-1 max-[880px]:w-auto" role="search" onSubmit={search}>
          <label className="sr-only" htmlFor="global-search">Buscar procesos o tareas</label>
          <input className="min-w-0 flex-1 bg-transparent px-3 outline-none" id="global-search" name="query" type="search" placeholder="Buscar procesos, tareas…" />
          <button className="rounded-lg px-2 font-extrabold text-primary max-sm:hidden" type="submit">Buscar</button>
        </form>
        <div className="relative flex items-center gap-1" ref={notificationsRef}>
          <button className={cn("relative grid size-9.5 place-items-center rounded-xl border border-line bg-white text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary-soft", notifications && "border-primary/30 bg-primary-soft")} type="button" aria-label={notifications ? "Cerrar notificaciones" : "Abrir notificaciones, 2 nuevas"} aria-expanded={notifications} onClick={() => setNotifications((value) => !value)}>
            <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            <span className="absolute -right-1 -top-1 grid min-w-4.5 place-items-center rounded-full border-2 border-white bg-[#e85d50] px-1 text-[.6rem] font-black leading-3.5 text-white" aria-hidden="true">2</span>
          </button>
          {notifications && <div className="absolute right-0 top-11 w-[min(330px,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-3 shadow-card" role="region" aria-label="Notificaciones">
            <header className="flex justify-between"><strong>Notificaciones</strong><span className="text-xs text-primary">2 nuevas</span></header>
            <p className="my-2 rounded-lg bg-[#f6f9f9] p-2.5 text-xs">El proceso de incorporación avanzó a revisión.<time className="block text-[.65rem] text-muted">Hace 12 minutos</time></p>
            <p className="my-2 rounded-lg bg-[#f6f9f9] p-2.5 text-xs">Vence hoy la aprobación del contrato marco.<time className="block text-[.65rem] text-muted">Hace 35 minutos</time></p>
          </div>}
          <Link className="flex items-center gap-2 rounded-xl p-1 no-underline" href="/perfil"><span className="grid size-7.5 place-items-center rounded-lg bg-primary text-xs text-white">{initials}</span><b className="grid text-xs leading-tight max-sm:hidden">{userName}<small className="font-normal text-muted">{roleLabel}</small></b></Link>
        </div>
      </nav>
    </header>
    <div className="grid flex-1 grid-cols-[260px_minmax(0,1fr)] max-[880px]:grid-cols-1">
      <aside ref={asideRef} id="app-sidebar" className={cn("flex flex-col bg-[#153740] px-4 py-6 text-[#d9e8e9] max-[880px]:fixed max-[880px]:inset-[58px_auto_0_0] max-[880px]:z-35 max-[880px]:w-[min(290px,86vw)] max-[880px]:-translate-x-[105%] max-[880px]:overflow-y-auto max-[880px]:shadow-card max-[880px]:transition-transform", sidebar && "max-[880px]:translate-x-0")} aria-label="Navegación de Docli">
        <h2 className="px-2.5 text-lg font-bold text-white">Espacio de trabajo<br />{organizationName}</h2>
        <nav>{sections.map((section) => <div key={section.title}>
          <h3 className="mx-2.5 mb-2 mt-6 text-xs font-bold uppercase tracking-[.12em] text-[#8db0b5]">{section.title}</h3>
          {section.links.map((link) => {
            const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(`${link.href}/`));
            return <Link className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 no-underline hover:bg-white/12 hover:text-white aria-[current=page]:bg-primary aria-[current=page]:text-white" key={`${section.title}-${link.label}`} href={link.href} aria-current={active ? "page" : undefined}><span aria-hidden="true">{link.icon}</span>{link.label}</Link>;
          })}
        </div>)}</nav>
        <div className="mt-auto border-t border-white/10 px-2.5 pt-4"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-white/15 text-xs">{initials}</span><b className="grid text-xs">{userName}<small className="font-normal text-[#8db0b5]">{roleLabel}</small></b></div><button className="mt-3 w-full rounded-lg p-2.5 text-left text-[#b9ced1] hover:bg-white/8" type="button" onClick={() => setLogout(true)}>↪ Cerrar sesión</button></div>
      </aside>
      <main id="main-content" className="min-w-0 w-full p-[clamp(1.25rem,3vw,2.5rem)] max-sm:p-4">{children}</main>
    </div>
    <footer className="mt-auto grid justify-items-center gap-2 bg-[#112b33] p-5 text-center text-xs text-[#cbd8db]"><span>© 2026 Docli. Todos los derechos reservados.</span><AmbValentCredit dark /></footer>
    {toast && <div className="fixed left-1/2 top-18 z-100 max-w-[calc(100vw-2.5rem)] -translate-x-1/2 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink shadow-card" role="status">{toast}</div>}
    {error && <FeedbackDialog message={error} onClose={() => setError("")} />}
    {logout && <div className="fixed inset-0 z-100 grid place-items-center bg-[#0e232a]/52 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setLogout(false)}>
      <div className="w-[min(410px,100%)] rounded-[20px] bg-white p-6 shadow-card" role="dialog" aria-modal="true" aria-labelledby="logout-title">
        <span className="grid size-11 place-items-center rounded-xl bg-[#fff0ee] text-danger" aria-hidden="true">↪</span><h2 className="mb-2 mt-4 text-xl font-bold" id="logout-title">¿Cerrar sesión?</h2>
        <p className="text-muted">Tendrás que volver a ingresar tus credenciales para acceder al espacio de trabajo.</p>
        <div className="flex justify-end gap-2"><button className="rounded-lg border border-line bg-white px-3 py-2 font-bold" type="button" onClick={() => setLogout(false)}>Cancelar</button><button className="rounded-lg border border-danger bg-danger px-3 py-2 font-bold text-white" type="button" onClick={confirmLogout}>Sí, cerrar sesión</button></div>
      </div>
    </div>}
  </div>;
}
