import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) return apiError("Revisa los campos enviados e inténtalo nuevamente.", 422);
  console.error(error);
  return apiError("El servidor no pudo completar la operación. Inténtalo nuevamente más tarde.", 500);
}

export function parseDate(value: string | null | undefined) {
  return value ? new Date(value) : undefined;
}
