"use client";

import { Save, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RISK_BADGE, RISK_LEVELS, RISK_SCORE } from "@/lib/constants/risk";
import type { RiskLevel } from "@/lib/constants/states";
import type { StateDoc } from "@/lib/types";

export function SecurityStatesClient({ states }: { states: StateDoc[] }) {
  const router = useRouter();
  const [riskEdits, setRiskEdits] = useState<Record<string, RiskLevel>>({});
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});
  const [savingCode, setSavingCode] = useState<string | null>(null);

  async function updateRisk(stateCode: string, currentRisk: RiskLevel, currentNote?: string) {
    setSavingCode(stateCode);
    try {
      const riskLevel = riskEdits[stateCode] ?? currentRisk;
      const note = noteEdits[stateCode] ?? currentNote ?? "";
      const res = await fetch("/api/security/states", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "update_state_risk",
          stateCode,
          riskLevel,
          note,
        }),
      });
      if (res.ok) {
        toast.success(`Updated ${stateCode} security rating to ${riskLevel}`);
        router.refresh();
      }
    } finally {
      setSavingCode(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-600" />
          State Security Risk Ratings (30% TOPSIS Weight)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Benefit scores: Low = 1.00 • Moderate = 0.66 • High = 0.33 • Critical = 0.05 (Hard-excluded unless consent
          granted).
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="overflow-x-auto max-h-[540px] border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th className="py-2.5 px-3">State (Zone)</th>
                <th className="py-2.5 px-3">Current Risk</th>
                <th className="py-2.5 px-3">TOPSIS Benefit Score</th>
                <th className="py-2.5 px-3">Set Risk Level</th>
                <th className="py-2.5 px-3">Security Advisory Note</th>
                <th className="py-2.5 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {states.map((s) => {
                const selectedRisk = riskEdits[s.code] ?? s.riskLevel;
                const noteVal = noteEdits[s.code] ?? s.note ?? "";
                return (
                  <tr key={s.code}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {s.name} ({s.zone})
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${RISK_BADGE[s.riskLevel]}`}>
                        {s.riskLevel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                      {RISK_SCORE[selectedRisk]}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={selectedRisk}
                        onChange={(e) =>
                          setRiskEdits({ ...riskEdits, [s.code]: e.target.value as RiskLevel })
                        }
                        className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                      >
                        {RISK_LEVELS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        value={noteVal}
                        onChange={(e) => setNoteEdits({ ...noteEdits, [s.code]: e.target.value })}
                        className="w-64 px-2.5 py-1.5 rounded border border-slate-300"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        disabled={savingCode === s.code}
                        onClick={() => updateRisk(s.code, s.riskLevel, s.note)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold inline-flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
