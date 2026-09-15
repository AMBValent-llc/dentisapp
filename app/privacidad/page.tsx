import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacidad",
  description: "Información sobre el tratamiento de datos personales y el uso de información en Docli.",
};

const sections = [
  {
    title: "Alcance",
    paragraphs: [
      <>Esta política explica cómo Docli trata la información que recibe mediante el sitio público, el registro, la autenticación y el uso de sus espacios de trabajo.</>,
      <>Docli es un producto diseñado y desarrollado por AMBValent. La información corporativa y de domicilio que no está publicada en este sitio puede solicitarse mediante el <Link className="font-semibold text-primary-dark" href="/contacto">formulario de contacto</Link>.</>,
    ],
  },
  {
    title: "Información tratada",
    paragraphs: [
      <>Al crear y usar una cuenta se tratan datos como nombre, correo electrónico, organización, credenciales protegidas, sesiones y la información que cada usuario incorpora a sus procesos, tareas, perfiles y demás módulos.</>,
      <>Según los módulos utilizados, el contenido puede incluir datos operativos, referencias a documentos externos y datos de atención clínica. La persona u organización que carga esa información debe contar con autorización y una base válida para hacerlo.</>,
      <>El formulario de contacto recibe el motivo de la consulta, nombre, correo, organización y mensaje. También se procesan datos técnicos necesarios para seguridad y funcionamiento, como cookies de sesión, dirección IP y registros de solicitudes.</>,
    ],
  },
  {
    title: "Finalidades",
    paragraphs: [
      <>La información se usa para crear y autenticar cuentas, prestar las funciones solicitadas, mantener la seguridad, responder consultas, diagnosticar fallos y proteger el servicio frente a abuso. No se describe en este sitio una finalidad de venta de datos personales.</>,
    ],
  },
  {
    title: "Proveedores y conservación",
    paragraphs: [
      <>La aplicación utiliza infraestructura de Cloudflare para ejecutar el servicio y Neon para la base de datos. El tratamiento que estos proveedores puedan realizar al operar su infraestructura se rige además por sus propios términos y políticas.</>,
      <>No se publica actualmente un plazo único de conservación. La información se mantiene mientras sea necesaria para operar la cuenta, atender la solicitud correspondiente, cumplir obligaciones aplicables o resolver controversias, y se elimina o anonimiza cuando deja de ser necesaria.</>,
    ],
  },
  {
    title: "Seguridad y decisiones del usuario",
    paragraphs: [
      <>Docli aplica controles técnicos como autenticación, sesiones y separación de datos por organización. Ningún sistema ofrece seguridad absoluta; cada usuario debe proteger sus credenciales, limitar los permisos y evitar incorporar información que no sea necesaria.</>,
    ],
  },
  {
    title: "Consultas y solicitudes",
    paragraphs: [
      <>Para solicitar acceso, corrección o eliminación de información, o plantear una consulta de privacidad, utiliza el <Link className="font-semibold text-primary-dark" href="/contacto">canal de contacto</Link>. La solicitud podrá requerir verificación de identidad y se atenderá según las obligaciones que resulten aplicables.</>,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacidad"
      summary="Esta política resume qué información trata Docli, para qué se utiliza y qué opciones tienen las personas usuarias."
      sections={sections}
    />
  );
}
