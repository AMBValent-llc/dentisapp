import { PublicShell } from "@/components/PublicShell";
import { Reveal } from "@/components/Reveal";
import { ButtonLink } from "@/components/ui";

const previewRows = [
  ["CO", "Incorporación de clientes", "Operaciones", "72%"],
  ["RC", "Revisión de contratos", "Legal", "45%"],
  ["CP", "Cierre mensual", "Administración", "88%"],
];

export default function LandingPage() {
  return <PublicShell landing>
    <main className="overflow-clip" id="main-content">
      <div className="relative isolate bg-[#f8fbfb]">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_38%,rgb(248_251_251/0.05)_47%,rgb(248_251_251/0.16)_55%,rgb(248_251_251/0.34)_63%,rgb(248_251_251/0.58)_71%,rgb(248_251_251/0.82)_79%,#f8fbfb_88%),linear-gradient(to_right,#075e68_0%,#08717d_52%,#087f8c_100%)]" aria-hidden="true" />
      <section className="relative z-10">
        <div className="relative z-10 mx-auto grid min-h-170 w-full max-w-330 grid-cols-[minmax(0,.86fr)_minmax(500px,1.14fr)] items-center gap-[clamp(2.5rem,7vw,7rem)] px-[clamp(1.25rem,4vw,3.5rem)] py-[clamp(4rem,8vw,7rem)] max-[880px]:grid-cols-1 max-sm:min-h-0 max-sm:pt-14">
          <Reveal className="text-white">
            <span className="mb-5 inline-block rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[.07em] text-white">● Procesos visibles de principio a fin</span>
            <h1 className="mb-5 text-[clamp(3.4rem,7vw,6.5rem)] font-bold leading-[.92] tracking-[-.07em] max-sm:text-[clamp(3.2rem,16vw,5rem)]">El trabajo fluye<br /><em className="not-italic text-[#9be5df]">cuando es claro.</em></h1>
            <p className="max-w-142.5 text-lg text-white/75">Diseña cómo debe hacerse el trabajo, asigna responsables y sigue cada avance sin perseguir mensajes. Docli reúne procesos, tareas, documentos y resultados en una sola vista.</p>
            <div className="my-7 flex flex-wrap gap-3"><ButtonLink href="/login" variant="light">Organizar mi equipo →</ButtonLink><ButtonLink className="border-white/40 bg-white/10 text-white hover:border-white hover:bg-white/18 hover:text-white" href="/planes" secondary>Ver planes</ButtonLink></div>
            <div className="flex flex-wrap gap-4 text-xs text-white/75"><span>✓ Puesta en marcha rápida</span><span>✓ Roles y trazabilidad</span><span>✓ Módulos especializados</span></div>
          </Reveal>
          <Reveal className="relative rounded-[22px] border border-white/35 bg-white shadow-[0_35px_90px_rgb(3_48_89/0.3)] [transform:perspective(1200px)_rotateY(-3deg)] max-[880px]:mx-auto max-[880px]:w-full max-[880px]:max-w-175 max-[880px]:transform-none" delay={140}>
          <header className="flex h-12 items-center gap-4 border-b border-[#e7eeee] px-3 text-[.65rem]"><b className="flex items-center gap-1.5"><i className="grid size-6 place-items-center rounded-lg bg-primary not-italic text-white">D</i> Docli</b><span className="ml-auto flex-1 rounded-lg bg-[#f3f7f7] px-2 py-1 text-[#9aabad]">Buscar procesos, tareas…</span><i className="grid size-6 place-items-center rounded-lg bg-primary not-italic text-white">AT</i></header>
          <div className="grid min-h-97.5 grid-cols-[115px_1fr] max-sm:grid-cols-[75px_1fr]">
            <aside className="grid content-start gap-1 rounded-bl-[21px] bg-[#153740] p-3 text-[.52rem] text-[#a9bec1] [&>*]:rounded-lg [&>*]:p-2"><b className="bg-primary text-white">▦ Dashboard</b><span>◎ Procesos</span><span>✓ Tareas</span><span>▤ Documentos</span><span>↗ Reportes</span></aside>
            <section className="min-w-0 rounded-br-[21px] bg-[#f5f8f8] p-5">
              <div className="flex items-center justify-between"><span className="grid"><small className="text-[.5rem] text-muted">Buenos días, Andrés</small><b className="text-sm">Trabajo en curso</b></span><i className="rounded-lg bg-primary px-2 py-1.5 text-[.5rem] not-italic text-white">＋ Nuevo proceso</i></div>
              <div className="my-4 grid grid-cols-3 gap-2 max-sm:grid-cols-2"><article className="grid rounded-xl border border-[#e3ebeb] bg-white p-3"><small className="text-[.46rem] text-muted">Procesos activos</small><b className="text-lg">12</b><em className="text-[.46rem] not-italic text-primary">3 por revisar</em></article><article className="grid rounded-xl border border-[#e3ebeb] bg-white p-3 max-sm:hidden"><small className="text-[.46rem] text-muted">Tareas completadas</small><b className="text-lg">84%</b><em className="text-[.46rem] not-italic text-primary">Esta semana</em></article><article className="grid rounded-xl border border-[#e3ebeb] bg-white p-3"><small className="text-[.46rem] text-muted">Próximo vencimiento</small><b className="text-lg">Hoy</b><em className="text-[.46rem] not-italic text-primary">Contrato marco</em></article></div>
              <div className="overflow-hidden rounded-xl border border-[#e3ebeb] bg-white"><header className="flex items-center justify-between border-b border-[#edf2f2] p-2.5 text-[.55rem]"><b>Procesos prioritarios</b><small className="text-muted">Ver todos</small></header>{previewRows.map((process) => <div className="flex items-center gap-2 border-b border-[#edf2f2] p-2.5" key={process[0]}><i className="grid size-7 place-items-center rounded-lg bg-primary-soft text-[.46rem] not-italic text-primary-dark">{process[0]}</i><span className="grid flex-1 text-[.52rem]"><b>{process[1]}</b><small className="text-[.43rem] text-muted">{process[2]}</small></span><strong className="text-[.43rem] text-primary">{process[3]}</strong></div>)}</div>
            </section>
          </div>
          <div className="animate-float absolute -bottom-6 -right-6 flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-3 text-[.65rem] shadow-card max-sm:right-2"><span className="grid size-7 place-items-center rounded-lg bg-[#e4f7ed] text-success">✓</span><b className="grid">Paso aprobado<small className="font-normal text-muted">El equipo recibió el cambio</small></b></div>
          </Reveal>
        </div>
      </section>
      <Reveal as="section" className="relative z-10 px-[max(1.25rem,calc((100vw-1180px)/2))] py-[clamp(4rem,8vw,7rem)]">
        <div className="mx-auto mb-10 max-w-180 text-center"><span className="text-xs font-extrabold uppercase tracking-[.1em] text-primary">Una forma común de trabajar</span><h2 className="my-2 text-[clamp(2.2rem,4vw,3.4rem)] font-bold" id="features-title">Del acuerdo a la ejecución, sin vacíos</h2><p className="text-muted">Cada persona sabe qué sigue, qué necesita y cómo se mide el resultado.</p></div>
        <div className="grid grid-cols-3 gap-4 max-[880px]:mx-auto max-[880px]:max-w-155 max-[880px]:grid-cols-1">
          {[["◎","Procesos repetibles","Define pasos, responsables y criterios para ejecutar siempre con el mismo estándar."],["✓","Trabajo coordinado","Ordena pendientes, fechas y bloqueos sin perder contexto entre canales."],["↗","Decisiones con evidencia","Consulta avances, tiempos y carga del equipo antes de ajustar la operación."]].map((feature, index) => <Reveal as="article" className="rounded-[18px] border border-line bg-[#fbfdfd] p-6 transition-[opacity,transform,box-shadow,border-color] hover:-translate-y-1 hover:border-primary/35 hover:shadow-soft" delay={index * 90} key={feature[1]}><span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">{feature[0]}</span><h3 className="mb-2 mt-4 text-lg font-bold">{feature[1]}</h3><p className="text-muted">{feature[2]}</p></Reveal>)}
        </div>
      </Reveal>
      </div>
      <Reveal as="section" className="mx-auto grid w-[min(1180px,calc(100%-2.5rem))] grid-cols-[.75fr_1.25fr] gap-12 py-[clamp(4rem,8vw,7rem)] max-[880px]:grid-cols-1"><div><span className="text-xs font-extrabold uppercase tracking-[.1em] text-primary">Se adapta a tu operación</span><h2 className="mt-3 text-4xl font-bold">Un núcleo común, distintos contextos.</h2></div><div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line max-sm:grid-cols-1">{["Operaciones y servicios","Legal y cumplimiento","Administración y finanzas","Salud y atención especializada"].map((area) => <div className="bg-white p-6 font-bold transition-colors hover:bg-primary-soft/60" key={area}>{area}<p className="mt-2 font-normal text-muted">Flujos configurables, trazabilidad y documentación según el trabajo de tu equipo.</p></div>)}</div></Reveal>
      <Reveal as="section" className="mx-auto my-[clamp(3rem,7vw,6rem)] flex w-[min(1180px,calc(100%-2.5rem))] items-center justify-between gap-8 rounded-[28px] bg-linear-to-br from-[#153740] to-primary p-[clamp(2rem,5vw,3.5rem)] text-white max-sm:flex-col max-sm:items-start"><div><span>Empieza con un proceso real</span><h2 className="my-2 text-[clamp(1.8rem,4vw,2.8rem)] font-bold">Convierte la forma de trabajar en un sistema compartido.</h2><p className="m-0 text-[#c4d9dc]">Configura el flujo, invita al equipo y detecta dónde se detiene el trabajo.</p></div><ButtonLink href="/login" variant="light">Entrar a Docli →</ButtonLink></Reveal>
    </main>
  </PublicShell>;
}
