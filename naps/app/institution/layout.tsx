import { PortalShell } from "@/components/PortalShell";
import { requireRole } from "@/lib/firebase/session";

export default async function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["institution", "admin"]);
  return <PortalShell user={user}>{children}</PortalShell>;
}
