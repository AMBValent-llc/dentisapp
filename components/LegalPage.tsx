import { PublicShell } from "./PublicShell";

type LegalSection = {
  title: string;
  paragraphs: React.ReactNode[];
};

export function LegalPage({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <PublicShell>
      <main className="mx-auto w-full max-w-295 flex-1 px-5 py-[clamp(2.5rem,7vw,5rem)]" id="main-content">
        <article className="mx-auto max-w-205">
          <header className="border-b border-line pb-8">
            <span className="text-xs font-extrabold uppercase tracking-[.1em] text-primary">Información legal</span>
            <h1 className="mb-4 mt-2 text-[clamp(2.3rem,5vw,4rem)] font-bold">{title}</h1>
            <p className="max-w-180 text-lg leading-8 text-muted">{summary}</p>
            <p className="mb-0 mt-4 text-sm font-semibold text-ink">
              Fecha de vigencia: <time dateTime="2026-09-15">15 de septiembre de 2026</time>
            </p>
          </header>
          <div className="grid gap-9 py-9">
            {sections.map((section) => (
              <section aria-labelledby={`legal-${section.title.toLowerCase().replaceAll(" ", "-")}`} key={section.title}>
                <h2 className="mb-3 text-2xl font-bold" id={`legal-${section.title.toLowerCase().replaceAll(" ", "-")}`}>{section.title}</h2>
                <div className="grid gap-3 text-base leading-7 text-muted">
                  {section.paragraphs.map((paragraph, index) => <p className="m-0" key={index}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
    </PublicShell>
  );
}
