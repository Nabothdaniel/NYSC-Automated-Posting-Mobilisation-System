import { PortalShell } from "@/components/PortalShell";
import { requireRole } from "@/lib/firebase/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin", "auditor"]);
  return <PortalShell user={user}>{children}</PortalShell>;
}
