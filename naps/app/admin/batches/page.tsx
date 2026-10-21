import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { Batch, Camp, StateDoc } from "@/lib/types";
import { BatchesCampsClient } from "./BatchesCampsClient";

export const dynamic = "force-dynamic";

export default async function AdminBatchesPage() {
  const user = await requireRole(["admin", "auditor"]);
  const [batchesSnap, campsSnap, statesSnap] = await Promise.all([
    db().collection("batches").get(),
    db().collection("camps").get(),
    db().collection("states").get(),
  ]);

  return (
    <BatchesCampsClient
      batches={docsOf<Batch>(batchesSnap)}
      camps={docsOf<Camp>(campsSnap)}
      states={docsOf<StateDoc>(statesSnap)}
      readOnly={user.role === "auditor"}
    />
  );
}
