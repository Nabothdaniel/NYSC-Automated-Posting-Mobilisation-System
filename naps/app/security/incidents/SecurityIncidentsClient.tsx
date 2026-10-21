"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RISK_LEVELS } from "@/lib/constants/risk";
import { STATES, stateName, type RiskLevel } from "@/lib/constants/states";
import type { SecurityIncident } from "@/lib/types";

export function SecurityIncidentsClient({ incidents }: { incidents: SecurityIncident[] }) {
  const router = useRouter();
  const [stateCode, setStateCode] = useState("KD");
  const [lga, setLga] = useState("Chikun");
  const [type, setType] = useState<SecurityIncident["type"]>("kidnapping");
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [date, setDate] = useState("2026-02-18");
  const [description, setDescription] = useState("");
  const [escalateRiskTo, setEscalateRiskTo] = useState<RiskLevel | "">("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/security/states", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "log_incident",
          stateCode,
          lga,
          type,
          severity,
          date,
          description,
          escalateRiskTo: escalateRiskTo || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Security incident logged and audit trail updated!");
        setDescription("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Field Security Incident Registry &amp; Risk Escalation
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Log verified field incidents and optionally escalate the state&apos;s security risk rating in real time.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs"
      >
        <div className="grid sm:grid-cols-5 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">State</label>
            <select
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">LGA</label>
            <input
              required
              value={lga}
              onChange={(e) => setLga(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Threat Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SecurityIncident["type"])}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {["kidnapping", "banditry", "terrorism", "communal", "accident", "other"].map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Severity (1–5)</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  Level {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Escalate State Risk?</label>
            <select
              value={escalateRiskTo}
              onChange={(e) => setEscalateRiskTo(e.target.value as RiskLevel | "")}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              <option value="">Keep current rating</option>
              {RISK_LEVELS.map((r) => (
                <option key={r} value={r}>
                  Escalate to {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Incident Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Operational Briefing / Description</label>
            <input
              required
              placeholder="Describe the incident and recommended corps member precautionary directive…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Log Incident
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="font-bold text-sm text-slate-900">
          Logged Security Incidents ({incidents.length})
        </div>
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    {stateName(inc.stateCode)} — {inc.lga} LGA
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold uppercase text-[10px]">
                    {inc.type} • Severity {inc.severity}/5
                  </span>
                </div>
                <p className="text-slate-700">{inc.description}</p>
              </div>
              <span className="font-mono text-slate-500">{inc.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
