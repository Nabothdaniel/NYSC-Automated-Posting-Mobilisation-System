import { Cpu, Download, Scale, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { InfoHint } from "@/components/InfoHint";
import { RISK_BADGE, SECURITY_BRIEFING } from "@/lib/constants/risk";
import { STATE_BY_CODE, stateName } from "@/lib/constants/states";
import { db } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { AuditLog, CandidateExplanation, CorpsMember, StateDoc, Weights } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MemberAllocationPage() {
  const user = await requireRole(["corps_member", "admin"]);
  const memberId = user.role === "corps_member" ? user.uid : "usr_pcm_001";

  const [memberSnap, explainSnap] = await Promise.all([
    db().collection("corpsMembers").doc(memberId).get(),
    db().collection("auditLogs").doc(`explain_${memberId}`).get(),
  ]);

  const member = memberSnap.data() as CorpsMember | undefined;
  const explain = explainSnap.data() as AuditLog | undefined;

  if (!member) {
    return <div className="p-6 bg-white rounded-xl border">Member not found.</div>;
  }

  if (!member.allocation) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <Cpu className="w-10 h-10 text-emerald-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Your State Posting Is Not Out Yet</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Your current status is <b>{member.status}</b>. As soon as NYSC HQ publishes the batch state postings, your
          assigned state, orientation camp, Call-Up Number, and score breakdown will appear here.
        </p>
        {user.role === "admin" && (
          <Link
            href="/admin/allocation"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
          >
            Go to State Posting Engine →
          </Link>
        )}
      </div>
    );
  }

  const stSnap = await db().collection("states").doc(member.allocation.stateCode).get();
  const stateDoc = stSnap.data() as StateDoc | undefined;
  const risk = stateDoc?.riskLevel ?? STATE_BY_CODE[member.allocation.stateCode]?.defaultRisk ?? "Low";
  const topCandidates = (explain?.details?.topCandidates as CandidateExplanation[] | undefined) ?? [];
  const excluded =
    (explain?.details?.excluded as { stateCode: string; reason: string }[] | undefined) ?? [];
  const weights = (explain?.details?.weights as Weights | undefined) ?? {
    security: 0.3,
    course: 0.25,
    preference: 0.2,
    integration: 0.15,
    capacity: 0.1,
  };

  return (
    <div className="space-y-6">
      {/* Main Allocation Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Your Official State &amp; Orientation Camp Posting
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {stateName(member.allocation.stateCode)} ({STATE_BY_CODE[member.allocation.stateCode]?.zone} Zone)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Orientation Camp: <b className="text-slate-800">{member.allocation.campName}</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-900">
              Call-Up No: {member.allocation.callUpNo}
            </div>
            <a
              href={`/api/letters/callup/${member.uid}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              Download Call-Up Letter (PDF)
            </a>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 flex items-center">
              Home State (Excluded)
              <InfoHint text="By NYSC law, no corps member can be posted to their state of origin." />
            </div>
            <div className="font-bold text-slate-900 mt-1">
              {stateName(member.stateOfOrigin)} ({STATE_BY_CODE[member.stateOfOrigin]?.zone})
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 flex items-center">
              State Safety Level
              <InfoHint text="Current security rating provided by national security liaison officers." />
            </div>
            <div className="mt-1">
              <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${RISK_BADGE[risk]}`}>
                {risk} Risk
              </span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 flex items-center">
              Overall Match Score
              <InfoHint text="Calculated between 0 and 1 (or 0% to 100%) using the TOPSIS ranking formula across safety, course demand, your choices, national unity, and camp space." />
            </div>
            <div className="font-mono font-bold text-emerald-700 text-sm mt-1">
              {Math.round(member.allocation.score * 100)}% ({member.allocation.score})
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500 flex items-center">
              Queue Position
              <InfoHint text="Graduates are placed in a fair, computer-shuffled queue before states are assigned so early or late registration gives no unfair advantage." />
            </div>
            <div className="font-mono text-slate-800 mt-1">
              #{member.allocation.rank} in Batch
            </div>
          </div>
        </div>
      </div>

      {/* Security Travel Briefing */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
          Important Safety &amp; Travel Advice for {stateName(member.allocation.stateCode)} ({risk} Risk)
        </div>
        <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
          {(SECURITY_BRIEFING[risk] ?? SECURITY_BRIEFING.Moderate).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>

      {/* Why This State? TOPSIS Algorithmic Transparency Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              Why Were You Posted to {stateName(member.allocation.stateCode)}?
              <InfoHint text="This table shows the top states considered for you and how each one scored from 0.00 (lowest) to 1.00 (highest) on the 5 posting rules." />
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Here is how the computer compared your top eligible states. Hover the <b>?</b> icons on the column headers
              to see what each score means.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified &amp; Tamper-Proof
          </span>
        </div>

        {topCandidates.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-left text-slate-600">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">State Considered</th>
                  <th className="py-2.5 px-3">
                    Safety ({Math.round(weights.security * 100)}%)
                    <InfoHint text="Low risk = 1.00, Moderate = 0.66, High = 0.33." />
                  </th>
                  <th className="py-2.5 px-3">
                    Need for Your Course ({Math.round(weights.course * 100)}%)
                    <InfoHint text="How many open employer job slots exist in that state for your discipline." />
                  </th>
                  <th className="py-2.5 px-3">
                    Your Choice ({Math.round(weights.preference * 100)}%)
                    <InfoHint text="1st choice = 1.00, 2nd = 0.75, 3rd = 0.50, 4th = 0.25, not chosen = 0." />
                  </th>
                  <th className="py-2.5 px-3">
                    National Unity ({Math.round(weights.integration * 100)}%)
                    <InfoHint text="Posting to a different region scores 1.00, neighbouring zone scores 0.66, same zone scores 0.33." />
                  </th>
                  <th className="py-2.5 px-3">
                    Camp Space ({Math.round(weights.capacity * 100)}%)
                    <InfoHint text="Fraction of orientation camp bed spaces still open at the moment of your posting." />
                  </th>
                  <th className="py-2.5 px-3 font-bold text-emerald-800">
                    Final Match Score
                    <InfoHint text="Overall TOPSIS closeness score (highest score wins your posting)." />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topCandidates.map((c, idx) => {
                  const chosen = idx === 0;
                  return (
                    <tr key={c.stateCode} className={chosen ? "bg-emerald-50/70 font-semibold" : ""}>
                      <td className="py-2.5 px-3 font-mono">#{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        {stateName(c.stateCode)} ({STATE_BY_CODE[c.stateCode]?.zone})
                        {chosen && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px]">
                            YOUR POSTING
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{c.criteria.security}</td>
                      <td className="py-2.5 px-3 font-mono">{c.criteria.course}</td>
                      <td className="py-2.5 px-3 font-mono">{c.criteria.preference}</td>
                      <td className="py-2.5 px-3 font-mono">{c.criteria.integration}</td>
                      <td className="py-2.5 px-3 font-mono">{c.criteria.capacity}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                        {Math.round(c.closeness * 100)}% ({c.closeness})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {excluded.length > 0 && (
          <div className="pt-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">States Automatically Skipped for Your Protection: </span>
            {excluded
              .map(
                (e) =>
                  `${stateName(e.stateCode)} (${
                    e.reason === "STATE_OF_ORIGIN"
                      ? "Your Home State"
                      : e.reason === "CRITICAL_NO_CONSENT"
                        ? "High Security Risk"
                        : "Camp Full"
                  })`,
              )
              .join(" • ")}
          </div>
        )}
      </div>
    </div>
  );
}
