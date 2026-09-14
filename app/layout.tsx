import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Docli", template: "%s | Docli" },
  description: "Diseña, ejecuta y mide procesos de trabajo con tareas, responsables, documentos y reportes en un solo lugar.",
  creator: "AMBValent",
  publisher: "AMBValent",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <a className="fixed -top-20 left-4 z-[1000] rounded-xl bg-ink px-4 py-3 text-white focus:top-4" href="#main-content">Saltar al contenido</a>
        {children}
      </body>
    </html>
  );
}
