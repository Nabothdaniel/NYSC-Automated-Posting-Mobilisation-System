import { PortalShell } from "@/components/PortalShell";
import { requireRole } from "@/lib/firebase/session";

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["employer", "admin"]);
  return <PortalShell user={user}>{children}</PortalShell>;
}
