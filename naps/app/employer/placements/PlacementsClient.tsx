"use client";

import { CheckCircle2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { stateName } from "@/lib/constants/states";
import type { CorpsMember } from "@/lib/types";

export function PlacementsClient({ matchedMembers }: { matchedMembers: CorpsMember[] }) {
  const router = useRouter();
  const [loadingUid, setLoadingUid] = useState<string | null>(null);

  async function confirmAssumptionOfDuty(memberUid: string) {
    setLoadingUid(memberUid);
    try {
      const res = await fetch("/api/employer/vacancies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "confirm_placement",
          memberUid,
        }),
      });
      if (res.ok) {
        toast.success("Confirmed assumption of duty! Corps member status updated to DEPLOYED.");
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error || "Confirmation failed");
      }
    } finally {
      setLoadingUid(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" />
          Matched Corps Members &amp; Assumption of Duty Confirmation ({matchedMembers.length})
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Confirming a matched corps member transitions their lifecycle status to <b>DEPLOYED</b> and logs the
          confirmation to the audit trail.
        </p>
      </div>

      {matchedMembers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No corps members have been matched to PPAs yet. Run State Allocation and PPA Matching from the Admin Portal
          first.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-y border-slate-200 text-left text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Corps Member</th>
                  <th className="py-2.5 px-3">Call-Up No.</th>
                  <th className="py-2.5 px-3">Course &amp; Degree</th>
                  <th className="py-2.5 px-3">Matched Employer &amp; Role</th>
                  <th className="py-2.5 px-3">Match Score</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Employer Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matchedMembers.map((m) => (
                  <tr key={m.uid}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {m.surname} {m.firstName}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{m.allocation?.callUpNo}</td>
                    <td className="py-2.5 px-3">
                      {m.course} ({m.qualification})
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-emerald-800">{m.ppa?.employerName}</div>
                      <div className="text-slate-500">
                        {m.ppa?.title} • {stateName(m.allocation?.stateCode)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{m.ppa?.score}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {m.status === "DEPLOYED" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={loadingUid === m.uid}
                          onClick={() => confirmAssumptionOfDuty(m.uid)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                        >
                          {loadingUid === m.uid ? "Confirming…" : "Confirm Duty → DEPLOYED"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
