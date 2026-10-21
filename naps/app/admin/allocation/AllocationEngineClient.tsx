"use client";

import {
  Cpu,
  Eye,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { InfoHint } from "@/components/InfoHint";
import { computeAhp, defaultAhpMatrix, makeReciprocal } from "@/lib/algorithms/ahp";
import type { AllocationDecision, AllocationStats } from "@/lib/algorithms/allocation";
import { stateName } from "@/lib/constants/states";
import {
  CRITERIA,
  CRITERION_LABEL,
  type AllocationConfig,
  type Batch,
  type Criterion,
  type Weights,
} from "@/lib/types";

interface EnrichedDecision extends AllocationDecision {
  fullName: string;
  matricNo: string;
  course: string;
  courseCategory: string;
  stateOfOrigin: string;
  originZone: string;
  postedZone: string;
  postedStateName: string;
}

export function AllocationEngineClient({
  initialConfig,
  batches,
  defaultBatchId,
  verifiedCount,
  allocatedCount,
  readOnly,
}: {
  initialConfig: AllocationConfig;
  batches: Batch[];
  defaultBatchId: string;
  verifiedCount: number;
  allocatedCount: number;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [matrix, setMatrix] = useState<number[][]>(
    initialConfig.ahpMatrix ?? defaultAhpMatrix(),
  );
  const [batchId, setBatchId] = useState(defaultBatchId);
  const [seedInput, setSeedInput] = useState("20260615");
  const [savingAhp, setSavingAhp] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<{
    dryRun: boolean;
    seed: number;
    weights: Weights;
    stats: AllocationStats;
    decisions: EnrichedDecision[];
  } | null>(null);
  const [inspectDecision, setInspectDecision] = useState<EnrichedDecision | null>(null);

  const liveAhp = computeAhp(makeReciprocal(matrix));
  const liveWeights = Object.fromEntries(
    CRITERIA.map((c, i) => [c, Math.round(liveAhp.weights[i]! * 1000) / 10]),
  ) as Record<Criterion, number>;

  function updateCell(i: number, j: number, val: number) {
    const next = matrix.map((r) => [...r]);
    next[i]![j] = val;
    next[j]![i] = Math.round((1 / val) * 1000) / 1000;
    setMatrix(next);
  }

  async function saveAhpWeights(resetDefault = false) {
    setSavingAhp(true);
    try {
      const target = resetDefault ? defaultAhpMatrix() : matrix;
      const res = await fetch("/api/admin/ahp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matrix: target, resetDefault }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save priority weights");
        return;
      }
      setMatrix(data.config.ahpMatrix);
      toast.success(
        `Posting priorities saved! Consistency Check CR = ${data.config.consistencyRatio} (Valid < 0.10)`,
      );
      router.refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSavingAhp(false);
    }
  }

  async function executeAllocation(dryRun: boolean) {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/allocation/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          batchId,
          dryRun,
          seed: Number(seedInput) || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Posting run failed");
        return;
      }
      setRunResult(data);
      toast.success(
        dryRun
          ? `Preview ready: ${data.stats.allocated} graduates matched to states (not published yet).`
          : `Final Postings Published! ${data.stats.allocated} Call-Up Letters & score explanations generated.`,
      );
      if (!dryRun) router.refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Smart State &amp; Camp Posting Control
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center">
            Posting Priority Settings &amp; Batch State Posting
            <InfoHint text="Uses Analytic Hierarchy Process (AHP) to set priority percentages and TOPSIS to score and rank eligible states for every verified graduate." />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Verified graduates waiting for posting: <b className="text-emerald-700">{verifiedCount}</b> • Already
            posted: <b>{allocatedCount}</b>
          </p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center ${
            liveAhp.consistent
              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
              : "bg-red-100 text-red-800 border border-red-300"
          }`}
        >
          Priority Logic Check (CR = {liveAhp.consistencyRatio.toFixed(4)}){" "}
          {liveAhp.consistent ? "✓ Balanced" : "✗ Contradictory"}
          <InfoHint text="Saaty's Consistency Ratio (CR) checks that your priority comparisons do not contradict each other. It must stay below 0.10 to save." />
        </span>
      </div>

      {/* Section 1: AHP Pairwise Comparison Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Step 1: Set National Posting Priority Weights (AHP Comparison Table)
              <InfoHint text="Each box compares the row priority against the column priority (e.g. 1.2 means the row is 20% more important than the column). The resulting percentage weights are shown in the rightmost column." />
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Default national policy weights: <b>Safety 30%</b>, <b>Course Need 25%</b>, <b>Graduate&apos;s Choice 20%</b>,{" "}
              <b>National Unity 15%</b>, and <b>Camp Space 10%</b>.
            </p>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingAhp}
                onClick={() => saveAhpWeights(true)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Standard Policy (30/25/20/15/10)
              </button>
              <button
                type="button"
                disabled={savingAhp || !liveAhp.consistent}
                onClick={() => saveAhpWeights(false)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save Priority Weights
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <th className="py-2.5 px-3 text-left">Posting Factor</th>
                {CRITERIA.map((c) => (
                  <th key={c} className="py-2.5 px-3 text-center">
                    {CRITERION_LABEL[c]}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right font-bold text-emerald-800">
                  Final Priority %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CRITERIA.map((rowCrit, i) => (
                <tr key={rowCrit}>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {CRITERION_LABEL[rowCrit]}
                  </td>
                  {CRITERIA.map((colCrit, j) => (
                    <td key={colCrit} className="py-2 px-2 text-center">
                      {i === j ? (
                        <span className="font-mono text-slate-400">1.00</span>
                      ) : i < j ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0.11"
                          max="9"
                          disabled={readOnly}
                          value={matrix[i]![j]}
                          onChange={(e) => updateCell(i, j, Number(e.target.value) || 1)}
                          className="w-20 px-2 py-1 text-center font-mono rounded border border-emerald-300 bg-emerald-50/40"
                        />
                      ) : (
                        <span className="font-mono text-slate-500">
                          {(1 / (matrix[j]![i] || 1)).toFixed(2)}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                    {liveWeights[rowCrit]}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: TOPSIS Batch Allocation Runner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-600" />
              Step 2: Preview or Publish Batch State Postings
              <InfoHint text="Click 'Preview Postings' to test the results without saving, or 'Publish Final Postings' to assign states, camp spaces, and Call-Up Numbers to all verified graduates." />
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically removes each graduate&apos;s home state, blocks Critical-risk states unless they gave
              consent, respects camp bed limits, and picks the best matching state.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.status})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 flex items-center">
                Shuffle Code:
                <InfoHint text="A reproducible random number seed used to shuffle the graduate queue fairly. Using the same code always produces the exact same result for audit verification." />
              </span>
              <input
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                className="w-28 px-2.5 py-2 rounded-xl border border-slate-300 font-mono text-xs"
              />
            </div>

            <button
              type="button"
              disabled={running}
              onClick={() => executeAllocation(true)}
              className="px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4" />
              Preview Postings (Test Run)
            </button>

            {!readOnly && (
              <button
                type="button"
                disabled={running || verifiedCount === 0}
                onClick={() => executeAllocation(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Play className="w-4 h-4" />
                {running ? "Posting Graduates…" : `Publish Final Postings (${verifiedCount} Graduates)`}
              </button>
            )}
          </div>
        </div>

        {/* Run Results & Integrity Verification */}
        {runResult && (
          <div className="space-y-5 pt-3 border-t border-slate-100">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs text-emerald-950">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">
                    {runResult.dryRun ? "Preview Results (Not Yet Published)" : "Published Batch Posting Results"}
                  </span>{" "}
                  (Shuffle Code: <code className="font-mono font-bold">{runResult.seed}</code>) — Rule Violations:{" "}
                  <b>{runResult.stats.originViolations} Home-State</b> •{" "}
                  <b>{runResult.stats.criticalWithoutConsent} Unsafe State w/o Consent</b> •{" "}
                  <b>{runResult.stats.campOverflows} Overcrowded Camps</b>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold">
                All NYSC Rules Followed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Graduates Posted</div>
                <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {runResult.stats.allocated} / {runResult.stats.total}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Got 1st Choice State</div>
                <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                  {runResult.stats.firstChoicePct}%
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Got One of 4 Choices</div>
                <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                  {runResult.stats.anyPreferencePct}%
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500 flex items-center">
                  Posted Outside Home Zone
                  <InfoHint text="National Integration Index: percentage of graduates posted to a geopolitical zone different from their zone of origin." />
                </div>
                <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {runResult.stats.integrationIndexPct}%
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500 flex items-center">
                  Average Match Score
                  <InfoHint text="Average TOPSIS closeness score across all posted graduates." />
                </div>
                <div className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
                  {Math.round(runResult.stats.avgCloseness * 100)}% ({runResult.stats.avgCloseness})
                </div>
              </div>
            </div>

            {/* Decisions Table */}
            <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 text-left">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Graduate</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Home State (Excluded)</th>
                    <th className="py-2.5 px-3">Posted State &amp; Camp</th>
                    <th className="py-2.5 px-3">Call-Up No.</th>
                    <th className="py-2.5 px-3">Choice Matched</th>
                    <th className="py-2.5 px-3">Match Score</th>
                    <th className="py-2.5 px-3">Why?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runResult.decisions.map((d) => (
                    <tr key={d.uid} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-500">{d.rank}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {d.fullName}
                        <div className="font-mono text-[10px] text-slate-500">{d.matricNo}</div>
                      </td>
                      <td className="py-2 px-3">
                        {d.course}
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {d.courseCategory}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {stateName(d.stateOfOrigin)} ({d.originZone})
                      </td>
                      <td className="py-2 px-3 font-semibold text-emerald-800">
                        {d.postedStateName} ({d.postedZone})
                        <div className="text-[10px] text-slate-500 font-normal">{d.campName}</div>
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold">{d.callUpNo}</td>
                      <td className="py-2 px-3">
                        {d.preferenceRank ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                            Choice #{d.preferenceRank}
                          </span>
                        ) : (
                          <span className="text-slate-400">Best Safe Match</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">
                        {Math.round(d.closeness * 100)}%
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => setInspectDecision(d)}
                          className="text-emerald-700 hover:underline font-semibold"
                        >
                          See Reason
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal for inspecting a single Corps Member's TOPSIS candidate ranking */}
      {inspectDecision && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Why {inspectDecision.fullName} Was Posted to {inspectDecision.postedStateName}
                </h3>
                <p className="text-xs text-slate-500">
                  Home State: <b>{stateName(inspectDecision.stateOfOrigin)}</b> • Assigned:{" "}
                  <b className="text-emerald-700">{inspectDecision.postedStateName}</b> (
                  {inspectDecision.callUpNo})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectDecision(null)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-left">
                  <th className="py-2 px-2.5">Rank</th>
                  <th className="py-2 px-2.5">State</th>
                  <th className="py-2 px-2.5">Safety</th>
                  <th className="py-2 px-2.5">Course Need</th>
                  <th className="py-2 px-2.5">Graduate Choice</th>
                  <th className="py-2 px-2.5">National Unity</th>
                  <th className="py-2 px-2.5">Camp Space</th>
                  <th className="py-2 px-2.5 font-bold text-emerald-700">Match Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspectDecision.candidates.slice(0, 10).map((c, idx) => (
                  <tr key={c.stateCode} className={idx === 0 ? "bg-emerald-50 font-semibold" : ""}>
                    <td className="py-2 px-2.5 font-mono">#{idx + 1}</td>
                    <td className="py-2 px-2.5">{stateName(c.stateCode)}</td>
                    <td className="py-2 px-2.5 font-mono">{c.criteria.security}</td>
                    <td className="py-2 px-2.5 font-mono">{c.criteria.course}</td>
                    <td className="py-2 px-2.5 font-mono">{c.criteria.preference}</td>
                    <td className="py-2 px-2.5 font-mono">{c.criteria.integration}</td>
                    <td className="py-2 px-2.5 font-mono">{c.criteria.capacity}</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-emerald-700">
                      {Math.round(c.closeness * 100)}% ({c.closeness})
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
