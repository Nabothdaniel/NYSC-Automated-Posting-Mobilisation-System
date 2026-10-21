import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { StateDoc } from "@/lib/types";
import { SecurityStatesClient } from "./SecurityStatesClient";

export const dynamic = "force-dynamic";

export default async function SecurityStatesPage() {
  await requireRole(["security", "admin"]);
  const snap = await db().collection("states").get();
  const states = docsOf<StateDoc>(snap);

  return <SecurityStatesClient states={states} />;
}
