import type { Metadata } from "next";
import { NewProcessForm } from "@/components/NewProcessForm";
import { PageHeading } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo proceso" };
export default function NewProcessPage() {
  return <><PageHeading eyebrow="Diseño de procesos" title="Crear un proceso" description="Define el propósito, el dueño y una primera secuencia de trabajo." /><NewProcessForm /></>;
}
