"use client";

import { Award, Building2, CheckCircle2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { stateName } from "@/lib/constants/states";
import type { CorpsMember } from "@/lib/types";

export function PpaActionClient({ member }: { member: CorpsMember }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [showAltForm, setShowAltForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const ppa = member.ppa!;

  async function respond(decision: "accept" | "alternative") {
    setLoading(true);
    try {
      const res = await fetch("/api/members/ppa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        setLoading(false);
        return;
      }
      toast.success(
        decision === "accept"
          ? "PPA placement accepted!"
          : "Alternative PPA request submitted. Re-run PPA matching from Admin portal to assign next match.",
      );
      setShowAltForm(false);
      router.refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Skills-Based Primary Assignment Match (Objective 7)
              </div>
              <h1 className="text-xl font-bold text-slate-900">{ppa.employerName}</h1>
              <p className="text-xs text-slate-500">
                Role: <b className="text-slate-800">{ppa.title}</b> • Location:{" "}
                <b className="text-slate-800">
                  {ppa.lga} LGA, {stateName(member.allocation?.stateCode)}
                </b>
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Status: {member.status}
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Your Qualification &amp; Category</div>
            <div className="font-bold text-slate-900 mt-1">
              {member.course} ({member.qualification})
            </div>
            <div className="text-emerald-700 font-medium">{member.courseCategory}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Composite Skills Match Score</div>
            <div className="font-mono font-bold text-emerald-700 text-base mt-1 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              {ppa.score} / 1.0000
            </div>
            <div className="text-[11px] text-slate-500">
              50% Discipline + 20% LGA Safety + 20% Qualification + 10% Capacity
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-slate-500">Acceptance &amp; Employer Confirmation</div>
            <div className="font-semibold text-slate-900 mt-1">
              {ppa.confirmedAt
                ? `Confirmed on ${new Date(ppa.confirmedAt).toLocaleDateString()}`
                : ppa.acceptedAt
                  ? "Accepted by you — awaiting Employer confirmation"
                  : member.status === "PPA_ALTERNATIVE_REQUESTED"
                    ? "Alternative PPA requested"
                    : "Awaiting your acceptance"}
            </div>
          </div>
        </div>

        {member.status === "PPA_MATCHED" && (
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => respond("accept")}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Accept Primary Assignment
            </button>
            {!ppa.altUsed && (
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowAltForm((v) => !v)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Request Alternative PPA (Max 1 Allowed)
              </button>
            )}
          </div>
        )}

        {showAltForm && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="text-xs font-bold text-amber-900">
              Request One-Time Alternative PPA (Requires Audited Justification)
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you are requesting an alternative PPA (e.g., distance from medical facility, specialized laboratory requirement)…"
              className="w-full p-3 rounded-lg border border-amber-300 bg-white text-xs"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => respond("alternative")}
              className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold"
            >
              Submit Alternative Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
