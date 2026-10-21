import { Building2 } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { CorpsMember } from "@/lib/types";
import { PpaActionClient } from "./PpaActionClient";

export const dynamic = "force-dynamic";

export default async function MemberPpaPage() {
  const user = await requireRole(["corps_member", "admin"]);
  const memberId = user.role === "corps_member" ? user.uid : "usr_pcm_001";
  const snap = await db().collection("corpsMembers").doc(memberId).get();
  const member = snap.data() as CorpsMember | undefined;

  if (!member) {
    return <div className="p-6 bg-white rounded-xl border">Member not found.</div>;
  }

  if (!member.ppa) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <Building2 className="w-10 h-10 text-emerald-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Place of Primary Assignment (PPA) Matching Pending</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Your discipline is <b>{member.course}</b> ({member.courseCategory}). Once the NYSC Administrator triggers the
          Skills-Based PPA Matching Engine for your deployed state, your matched employer will appear here.
        </p>
        {user.role === "admin" && (
          <Link
            href="/admin/ppa-matching"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
          >
            Go to Admin PPA Matching Engine →
          </Link>
        )}
      </div>
    );
  }

  return <PpaActionClient member={member} />;
}
