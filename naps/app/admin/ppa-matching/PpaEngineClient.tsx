"use client";

import { Award, Building2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { stateName } from "@/lib/constants/states";
import type { CorpsMember, Vacancy } from "@/lib/types";

export function PpaEngineClient({
  members,
  vacancies,
  defaultBatchId,
  readOnly,
}: {
  members: CorpsMember[];
  vacancies: Vacancy[];
  defaultBatchId: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  const readyForPpa = members.filter(
    (m) => m.status === "ALLOCATED" || m.status === "PPA_ALTERNATIVE_REQUESTED",
  );
  const matchedMembers = members.filter((m) => Boolean(m.ppa));

  async function handleRunPpa() {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/ppa/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchId: defaultBatchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "PPA matching failed");
        return;
      }
      toast.success(
        `PPA Matching Complete! ${data.matchedCount} matched (Discipline Alignment: ${data.stats.disciplineMatchPct}%)`,
      );
      router.refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Objective 7 — Skills-Based Primary Assignment (PPA) Engine
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            Automated Discipline-to-Employer PPA Matching
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Formula: <code>0.50·DisciplineFit + 0.20·Safety + 0.20·Qualification + 0.10·CapacityRatio</code>
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            disabled={running || readyForPpa.length === 0}
            onClick={handleRunPpa}
            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-xs"
          >
            <Play className="w-4 h-4" />
            {running
              ? "Matching Disciplines…"
              : `Run Skills PPA Matcher (${readyForPpa.length} Eligible PCMs)`}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-slate-500">Awaiting PPA Match (Allocated / Alt Request)</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{readyForPpa.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-slate-500">Matched to PPA</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{matchedMembers.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-slate-500">Active Registered Vacancies</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{vacancies.length}</div>
        </div>
      </div>

      {/* Matched Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          Matched Corps Members &amp; Assigned Employers ({matchedMembers.length})
        </h2>
        {matchedMembers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            First commit State Allocation on the{" "}
            <a href="/admin/allocation" className="text-emerald-700 font-semibold underline">
              AHP + TOPSIS Engine
            </a>{" "}
            page, then click <b>Run Skills PPA Matcher</b> above.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-left text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Corps Member</th>
                  <th className="py-2.5 px-3">Course (Category)</th>
                  <th className="py-2.5 px-3">Deployed State</th>
                  <th className="py-2.5 px-3">Matched Employer (PPA)</th>
                  <th className="py-2.5 px-3">Role Title</th>
                  <th className="py-2.5 px-3">Match Score</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matchedMembers.map((m) => (
                  <tr key={m.uid}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {m.surname} {m.firstName}
                    </td>
                    <td className="py-2.5 px-3">
                      {m.course} ({m.courseCategory})
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      {stateName(m.allocation?.stateCode)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-800">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {m.ppa?.employerName} ({m.ppa?.lga})
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{m.ppa?.title}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                      {m.ppa?.score}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
