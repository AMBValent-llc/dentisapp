import type { Metadata } from "next";
import { NewPatientForm } from "@/components/NewPatientForm";

export const metadata: Metadata = { title: "Nuevo paciente" };
export default function NewPatientPage() { return <NewPatientForm />; }
