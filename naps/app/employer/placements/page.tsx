import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { CorpsMember } from "@/lib/types";
import { PlacementsClient } from "./PlacementsClient";

export const dynamic = "force-dynamic";

export default async function EmployerPlacementsPage() {
  await requireRole(["employer", "admin"]);
  const snap = await db().collection("corpsMembers").get();
  const matched = docsOf<CorpsMember>(snap).filter((m) => Boolean(m.ppa));

  return <PlacementsClient matchedMembers={matched} />;
}
