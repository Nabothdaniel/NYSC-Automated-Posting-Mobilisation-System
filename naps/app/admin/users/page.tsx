import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { AppUser } from "@/lib/types";
import { UsersAdminClient } from "./UsersAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await requireRole(["admin", "auditor"]);
  const snap = await db().collection("users").get();
  const users = docsOf<AppUser>(snap);

  return <UsersAdminClient users={users} readOnly={user.role === "auditor"} />;
}
