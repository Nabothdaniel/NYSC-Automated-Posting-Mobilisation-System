import { PortalShell } from "@/components/PortalShell";
import { requireRole } from "@/lib/firebase/session";

export default async function SecurityLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["security", "admin"]);
  return <PortalShell user={user}>{children}</PortalShell>;
}
