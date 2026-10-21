import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import { SEED_INSTITUTIONS } from "@/lib/seedData";
import type { CorpsMember, Institution } from "@/lib/types";
import { MemberProfileForm } from "./MemberProfileForm";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage() {
  const user = await requireRole(["corps_member", "admin"]);
  const memberId = user.role === "corps_member" ? user.uid : "usr_pcm_001";
  const [snap, instSnap] = await Promise.all([
    db().collection("corpsMembers").doc(memberId).get(),
    db().collection("institutions").get(),
  ]);
  const member = snap.data() as CorpsMember | undefined;
  const insts = docsOf<Institution>(instSnap);
  const institutions = insts.length > 0 ? insts : SEED_INSTITUTIONS;

  if (!member) {
    return <div className="p-6 bg-white rounded-xl border">Member profile not found.</div>;
  }

  return <MemberProfileForm initialMember={member} institutions={institutions} />;
}
