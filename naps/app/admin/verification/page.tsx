import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { CorpsMember, NimcRecord, SenateRecord } from "@/lib/types";
import { ExceptionsQueueClient } from "./ExceptionsQueueClient";

export const dynamic = "force-dynamic";

export default async function AdminVerificationQueuePage() {
  const user = await requireRole(["admin", "auditor"]);
  const [membersSnap, senateSnap, nimcSnap] = await Promise.all([
    db().collection("corpsMembers").get(),
    db().collection("senateLists").get(),
    db().collection("nimcRecords").get(),
  ]);

  const members = docsOf<CorpsMember>(membersSnap);
  const senateMatrics = docsOf<SenateRecord>(senateSnap).map((s) => s.matricNo.toUpperCase());
  const nimcNins = docsOf<NimcRecord>(nimcSnap).map((n) => n.nin);

  return (
    <ExceptionsQueueClient
      allMembers={members}
      senateMatrics={senateMatrics}
      nimcNins={nimcNins}
      readOnly={user.role === "auditor"}
    />
  );
}
