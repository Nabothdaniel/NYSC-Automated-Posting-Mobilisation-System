import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import { SEED_INSTITUTIONS } from "@/lib/seedData";
import type { CorpsMember, SenateRecord } from "@/lib/types";
import { SenateUploadClient } from "./SenateUploadClient";

export const dynamic = "force-dynamic";

export default async function InstitutionSenateListPage() {
  const user = await requireRole(["institution", "admin"]);
  const instId = user.orgId || "inst_nsuk";
  const [senateSnap, membersSnap] = await Promise.all([
    db().collection("senateLists").get(),
    db().collection("corpsMembers").get(),
  ]);

  const records = docsOf<SenateRecord>(senateSnap);
  const members = docsOf<CorpsMember>(membersSnap);

  return (
    <SenateUploadClient
      institutionId={instId}
      institutions={SEED_INSTITUTIONS}
      existingRecords={records}
      registeredMembers={members}
    />
  );
}
