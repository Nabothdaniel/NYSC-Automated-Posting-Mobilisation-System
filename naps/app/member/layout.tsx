import { PortalShell } from "@/components/PortalShell";
import { requireRole } from "@/lib/firebase/session";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["corps_member", "admin"]);
  return <PortalShell user={user}>{children}</PortalShell>;
}
