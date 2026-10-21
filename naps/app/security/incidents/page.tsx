import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { SecurityIncident } from "@/lib/types";
import { SecurityIncidentsClient } from "./SecurityIncidentsClient";

export const dynamic = "force-dynamic";

export default async function SecurityIncidentsPage() {
  await requireRole(["security", "admin"]);
  const snap = await db().collection("securityIncidents").get();
  const incidents = docsOf<SecurityIncident>(snap).sort((a, b) => b.date.localeCompare(a.date));

  return <SecurityIncidentsClient incidents={incidents} />;
}
