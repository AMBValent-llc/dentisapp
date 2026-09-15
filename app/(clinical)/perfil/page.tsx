import type { Metadata } from "next";
import { ProfileForm } from "@/components/ProfileForm";
import { PageHeading } from "@/components/ui";
import { requirePageContext } from "@/lib/server-auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Mi perfil" };
export default async function ProfilePage() {
  const { session, organization, membership } = await requirePageContext();
  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });
  if (!user) throw new Error("User not found");
  return <><PageHeading eyebrow="Cuenta" title="Mi perfil" /><ProfileForm profile={{ name: user.name, email: user.email, phone: user.phone, role: membership.role, organizationName: organization.name, sector: organization.sector, timezone: organization.timezone }} /></>;
}
