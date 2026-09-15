import type { Metadata } from "next";
import { PageHeading, cardClass } from "@/components/ui";
import { requirePageContext } from "@/lib/server-auth";
import { db } from "@/lib/db";
import { DocumentForm } from "@/components/DocumentForm";

export const metadata: Metadata = { title: "Documentos" };
export default async function DocumentsPage() {
  const { organization } = await requirePageContext();
  const documents = await db.query.documents.findMany({
    where: (documents, { eq }) => eq(documents.organizationId, organization.id),
    with: { process: true, uploadedBy: true },
    orderBy: (documents, { desc }) => [desc(documents.createdAt)],
  });
  return <><PageHeading eyebrow="Repositorio" title="Documentos" description="Referencias vinculadas al proceso que les da contexto." />
    <DocumentForm /><section className={`${cardClass} overflow-hidden p-4`}><div className="grid gap-2">{documents.map((document) => <article className="grid grid-cols-[48px_1.3fr_1fr_130px] items-center gap-3 rounded-xl border border-line p-3 max-sm:grid-cols-[42px_1fr]" key={document.id}><span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-[.65rem] font-extrabold text-primary">{document.mimeType?.split("/")[1]?.toUpperCase().slice(0, 4) ?? "META"}</span><div><h2 className="m-0 text-sm font-bold">{document.name}</h2><small className="text-muted">{document.category ?? "Sin categoría"}</small></div><span className="text-sm text-muted max-sm:col-start-2">{document.process?.name ?? "Sin proceso"}</span><time className="text-xs text-muted max-sm:col-start-2">{document.createdAt.toLocaleDateString("es-CO")}</time></article>)}</div>{!documents.length && <p className="p-8 text-center text-muted">Aún no hay referencias documentales.</p>}<p className="mb-0 mt-4 text-xs text-muted">Se almacena únicamente metadata y enlaces; Docli no aloja archivos en esta versión.</p></section>
  </>;
}
