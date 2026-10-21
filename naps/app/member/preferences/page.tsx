import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { Camp, CorpsMember, StateDoc } from "@/lib/types";
import { PreferencesClient } from "./PreferencesClient";

export const dynamic = "force-dynamic";

export default async function MemberPreferencesPage() {
  const user = await requireRole(["corps_member", "admin"]);
  const memberId = user.role === "corps_member" ? user.uid : "usr_pcm_001";

  const [memberSnap, statesSnap, campsSnap] = await Promise.all([
    db().collection("corpsMembers").doc(memberId).get(),
    db().collection("states").get(),
    db().collection("camps").get(),
  ]);

  const member = memberSnap.data() as CorpsMember | undefined;
  const states = docsOf<StateDoc>(statesSnap);
  const camps = docsOf<Camp>(campsSnap);

  if (!member) {
    return <div className="p-6 bg-white rounded-xl border">Member profile not found.</div>;
  }

  return <PreferencesClient initialMember={member} states={states} camps={camps} />;
}
