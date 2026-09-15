import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Términos",
  description: "Condiciones básicas para acceder y utilizar Docli.",
};

const sections = [
  {
    title: "Aceptación y alcance",
    paragraphs: [
      <>Estos términos regulan el acceso y uso de Docli. Al crear una cuenta o utilizar el servicio, la persona usuaria confirma que puede aceptar estas condiciones por sí misma o en nombre de su organización.</>,
      <>Docli es un producto diseñado y desarrollado por AMBValent. La información corporativa y de domicilio que no está publicada en este sitio puede solicitarse mediante el <Link className="font-semibold text-primary-dark" href="/contacto">formulario de contacto</Link>.</>,
    ],
  },
  {
    title: "Cuentas y acceso",
    paragraphs: [
      <>Cada usuario debe proporcionar información correcta, proteger sus credenciales y mantener actualizados los permisos de su espacio. Las acciones realizadas desde una cuenta se atribuyen a quien tenga acceso a ella, salvo que se informe oportunamente un uso no autorizado.</>,
    ],
  },
  {
    title: "Uso permitido",
    paragraphs: [
      <>Docli puede usarse para organizar procesos, tareas, documentos referenciados y otros registros disponibles en el producto. No debe utilizarse para vulnerar derechos, introducir código malicioso, intentar acceder a cuentas o datos ajenos, interferir con el servicio ni realizar actividades ilícitas.</>,
      <>Quien incorpora contenido conserva la responsabilidad de su exactitud, licitud y permisos. En particular, antes de registrar datos personales o clínicos debe contar con las autorizaciones y medidas exigibles para su actividad.</>,
    ],
  },
  {
    title: "Servicio y contenidos externos",
    paragraphs: [
      <>Las funciones pueden cambiar para corregir errores, mejorar seguridad o evolucionar el producto. Aunque se procura mantener el servicio disponible, no se garantiza operación ininterrumpida ni que sea adecuado para todas las obligaciones particulares de una organización.</>,
      <>Docli puede almacenar referencias y enlaces a documentos externos, pero no controla la disponibilidad, seguridad o contenido de esos servicios de terceros.</>,
    ],
  },
  {
    title: "Suspensión y terminación",
    paragraphs: [
      <>El acceso puede limitarse cuando sea necesario para proteger el servicio, investigar un uso indebido o responder a una obligación aplicable. La persona usuaria puede solicitar el cierre de su cuenta mediante el <Link className="font-semibold text-primary-dark" href="/contacto">canal de contacto</Link>, sujeto a la verificación correspondiente y a la conservación que resulte necesaria.</>,
    ],
  },
  {
    title: "Privacidad y cambios",
    paragraphs: [
      <>El tratamiento de información se explica en la <Link className="font-semibold text-primary-dark" href="/privacidad">Política de privacidad</Link>. Si estos términos cambian, se actualizará su fecha de vigencia y, cuando corresponda, se comunicará el cambio por un medio razonable antes de que produzca efectos.</>,
    ],
  },
  {
    title: "Contacto",
    paragraphs: [
      <>Las preguntas sobre estas condiciones pueden enviarse mediante el <Link className="font-semibold text-primary-dark" href="/contacto">formulario de contacto de Docli</Link>.</>,
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos"
      summary="Estas condiciones establecen reglas básicas y transparentes para utilizar Docli y proteger a las personas, las organizaciones y el servicio."
      sections={sections}
    />
  );
}
