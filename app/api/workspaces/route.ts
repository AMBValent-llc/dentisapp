import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  sector: z.string().trim().max(80).optional(),
  teamSize: z.string().trim().max(40).optional(),
  plan: z.string().trim().max(40).default("starter"),
});

export async function GET() {
  const context = await requireApiContext();
  if (!context) return apiError("No autorizado", 401);
  return Response.json({ organization: context.organization, role: context.membership.role });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return apiError("No autorizado", 401);
    const existing = await prisma.membership.findFirst({ where: { userId: session.user.id } });
    if (existing) return apiError("El usuario ya pertenece a una organización", 409);
    const data = schema.parse(await request.json());
    const base = data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "equipo";
    const organization = await prisma.$transaction(async (tx) => {
      let slug = base;
      for (let suffix = 1; await tx.organization.findUnique({ where: { slug } }); suffix++) slug = `${base}-${suffix}`;
      return tx.organization.create({
        data: { ...data, slug, memberships: { create: { userId: session.user.id, role: "OWNER" } } },
      });
    });
    return Response.json({ organization }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
