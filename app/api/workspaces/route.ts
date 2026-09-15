import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";
import { getSession, requireApiContext } from "@/lib/server-auth";
import { apiError, handleApiError } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  sector: z.string().trim().max(80).optional(),
  teamSize: z.string().trim().max(40).optional(),
  plan: z.string().trim().max(40).default("starter"),
});

export async function GET() {
  try {
    const context = await requireApiContext();
    if (!context) return apiError("No autorizado", 401);
    return Response.json({ organization: context.organization, role: context.membership.role });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return apiError("No autorizado", 401);
    const existing = await db.query.memberships.findFirst({ where: eq(memberships.userId, session.user.id) });
    if (existing) return apiError("El usuario ya pertenece a una organización", 409);
    const data = schema.parse(await request.json());
    const base = data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "equipo";
    let slug = base;
    for (let suffix = 1; await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) }); suffix++) slug = `${base}-${suffix}`;
    const organizationId = crypto.randomUUID();
    const [[organization]] = await db.batch([
      db.insert(organizations).values({ ...data, id: organizationId, slug }).returning(),
      db.insert(memberships).values({ id: crypto.randomUUID(), organizationId, userId: session.user.id, role: "OWNER" }),
    ]);
    if (!organization) throw new Error("Organization creation returned no row");
    return Response.json({ organization }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
