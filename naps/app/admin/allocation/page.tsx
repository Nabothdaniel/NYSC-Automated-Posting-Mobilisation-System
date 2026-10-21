import { defaultAhpMatrix } from "@/lib/algorithms/ahp";
import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import { DEFAULT_BATCH_ID } from "@/lib/seedData";
import {
  DEFAULT_WEIGHTS,
  type AllocationConfig,
  type Batch,
  type CorpsMember,
} from "@/lib/types";
import { AllocationEngineClient } from "./AllocationEngineClient";

export const dynamic = "force-dynamic";

export default async function AdminAllocationPage() {
  const user = await requireRole(["admin", "auditor"]);

  const [cfgSnap, batchesSnap, membersSnap] = await Promise.all([
    db().collection("config").doc("allocation").get(),
    db().collection("batches").get(),
    db().collection("corpsMembers").get(),
  ]);

  const config: AllocationConfig = (cfgSnap.data() as AllocationConfig | undefined) ?? {
    weights: DEFAULT_WEIGHTS,
    ahpMatrix: defaultAhpMatrix(),
    consistencyRatio: 0.004,
    updatedBy: "usr_admin_hq",
    updatedAt: new Date().toISOString(),
  };

  const batches = docsOf<Batch>(batchesSnap);
  const members = docsOf<CorpsMember>(membersSnap);
  const verifiedCount = members.filter((m) => m.status === "VERIFIED").length;
  const allocatedCount = members.filter((m) => Boolean(m.allocation)).length;

  return (
    <AllocationEngineClient
      initialConfig={config}
      batches={batches}
      defaultBatchId={DEFAULT_BATCH_ID}
      verifiedCount={verifiedCount}
      allocatedCount={allocatedCount}
      readOnly={user.role === "auditor"}
    />
  );
}
