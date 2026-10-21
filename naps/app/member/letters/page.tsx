import { CheckCircle2, Download, ExternalLink, FileText, QrCode } from "lucide-react";
import Link from "next/link";
import { stateName } from "@/lib/constants/states";
import { db } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { CorpsMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MemberLettersPage() {
  const user = await requireRole(["corps_member", "admin"]);
  const memberId = user.role === "corps_member" ? user.uid : "usr_pcm_001";
  const snap = await db().collection("corpsMembers").doc(memberId).get();
  const member = snap.data() as CorpsMember | undefined;

  if (!member) {
    return <div className="p-6 bg-white rounded-xl border">Member not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">Official Call-Up &amp; PPA Posting Letters</h1>
        <p className="text-xs text-slate-500 mt-1">
          Each generated PDF includes a cryptographic verification QR code linked to the public NAPS verification
          registry.
        </p>
      </div>

      {member.allocation ? (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Download
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                NYSC Call-Up &amp; Deployment Letter (PDF)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Call-Up No: <b className="font-mono text-slate-800">{member.allocation.callUpNo}</b> • Deployed State:{" "}
                <b>{stateName(member.allocation.stateCode)}</b> ({member.allocation.campName})
              </p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={`/api/letters/callup/${member.uid}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                Open / Download Official PDF
              </a>
              <Link
                href={`/verify/${encodeURIComponent(member.allocation.callUpNo)}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                Test QR Verification Page
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3 text-xs text-slate-600">
            <div className="font-bold text-sm text-slate-900">What is embedded in your PDF Letter?</div>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Full bio-data, NIN, Matriculation Number, and Institution verification stamp</li>
              <li>Assigned State, Geopolitical Zone, Orientation Camp, and Reporting Date</li>
              <li>TOPSIS Closeness Score (Ci) and Allocation Run ID</li>
              <li>Place of Primary Assignment (PPA) employer &amp; role (once matched)</li>
              <li>State Security Risk Level travel briefing &amp; emergency hotlines</li>
              <li>Scannable QR Code pointing to <code>/verify/[callUpNo]</code></li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          Your Call-Up Letter will be generated automatically as soon as your batch state allocation is run.
        </div>
      )}
    </div>
  );
}
