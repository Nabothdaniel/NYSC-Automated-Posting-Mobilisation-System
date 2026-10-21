"use client";

import { Building2, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { RISK_BADGE } from "@/lib/constants/risk";
import type { Batch, Camp, StateDoc } from "@/lib/types";

export function BatchesCampsClient({
  batches,
  camps,
  states,
  readOnly,
}: {
  batches: Batch[];
  camps: Camp[];
  states: StateDoc[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [year, setYear] = useState(2026);
  const [batchLetter, setBatchLetter] = useState<"A" | "B" | "C">("B");
  const [stream, setStream] = useState<"I" | "II">("I");
  const [mobDate, setMobDate] = useState("2026-09-10");
  const [capEdits, setCapEdits] = useState<Record<string, number>>({});

  const stateByCode = new Map(states.map((s) => [s.code, s]));

  async function createBatch(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create_batch",
        year,
        batch: batchLetter,
        stream,
        mobilizationDate: mobDate,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Could not create batch");
      return;
    }
    toast.success(`Created ${data.batch.name}`);
    router.refresh();
  }

  async function saveCampCapacity(campId: string, capacity: number) {
    const res = await fetch("/api/admin/batches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update_camp_capacity",
        campId,
        capacity,
      }),
    });
    if (res.ok) {
      toast.success("Camp capacity updated");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Batches */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Mobilisation Batches &amp; Streams</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure mobilization dates and age eligibility thresholds (30 years at mobilization).
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b) => (
            <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{b.name}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold uppercase text-[10px]">
                  {b.status}
                </span>
              </div>
              <div className="text-slate-600">Mobilization Date: <b>{b.mobilizationDate}</b></div>
              <div className="text-slate-500">Max Age Limit: {b.maxAge} years</div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <form onSubmit={createBatch} className="pt-4 border-t border-slate-100 flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-24 px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Batch</label>
              <select
                value={batchLetter}
                onChange={(e) => setBatchLetter(e.target.value as "A" | "B" | "C")}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="A">Batch A</option>
                <option value="B">Batch B</option>
                <option value="C">Batch C</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stream</label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value as "I" | "II")}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white"
              >
                <option value="I">Stream I</option>
                <option value="II">Stream II</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobilization Date</label>
              <input
                type="date"
                value={mobDate}
                onChange={(e) => setMobDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Batch
            </button>
          </form>
        )}
      </div>

      {/* Orientation Camps Capacity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          37 Orientation Camps &amp; Infrastructure Capacity Limits (10% AHP Weight + Hard Ceiling)
        </h2>
        <div className="overflow-x-auto max-h-[480px] border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th className="py-2.5 px-3">State (Zone)</th>
                <th className="py-2.5 px-3">Orientation Camp</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 px-3">Occupied</th>
                <th className="py-2.5 px-3">Capacity</th>
                {!readOnly && <th className="py-2.5 px-3">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {camps.map((c) => {
                const st = stateByCode.get(c.stateCode);
                const val = capEdits[c.id] ?? c.capacity;
                return (
                  <tr key={c.id}>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {st?.name ?? c.stateCode} ({st?.zone})
                    </td>
                    <td className="py-2 px-3 text-slate-700">{c.name}</td>
                    <td className="py-2 px-3">
                      {st && (
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${RISK_BADGE[st.riskLevel]}`}>
                          {st.riskLevel}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-700">{c.occupied}</td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={val}
                        onChange={(e) => setCapEdits({ ...capEdits, [c.id]: Number(e.target.value) })}
                        className="w-24 px-2 py-1 rounded border border-slate-300 font-mono"
                      />
                    </td>
                    {!readOnly && (
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => saveCampCapacity(c.id, val)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-semibold inline-flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" /> Save
                        </button>
                      </td>
                    )}
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
