import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, handleApiError } from "@/lib/api";

const schema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().max(200), company: z.string().trim().max(160).optional(), message: z.string().trim().min(10).max(5000) });
const attempts = new Map<string, number[]>();
const WINDOW = 60 * 60 * 1000;
const LIMIT = 5;

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const now = Date.now();
    const recent = (attempts.get(ip) ?? []).filter((timestamp) => now - timestamp < WINDOW);
    if (recent.length >= LIMIT) return apiError("Demasiadas solicitudes. Inténtalo más tarde.", 429);
    const data = schema.parse(await request.json());
    attempts.set(ip, [...recent, now]);
    await prisma.contactSubmission.create({ data: { ...data, ipHash: createHash("sha256").update(ip).digest("hex") } });
    return Response.json({ message: "Solicitud recibida" }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
