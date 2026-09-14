import { AppShell } from "@/components/AppShell";
import { requirePageContext } from "@/lib/server-auth";

export default async function ClinicalLayout({ children }: { children: React.ReactNode }) {
  const { session, membership, organization } = await requirePageContext();
  return <AppShell userName={session.user.name} organizationName={organization.name} role={membership.role}>{children}</AppShell>;
}
