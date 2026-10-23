import { BarChart3, CheckCircle2, Download, Scale } from "lucide-react";
import Link from "next/link";
import { CATEGORY_LABEL, COURSE_CATEGORIES } from "@/lib/constants/courses";
import { STATE_BY_CODE, ZONE_NAMES, type Zone } from "@/lib/constants/states";
import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { CorpsMember } from "@/lib/types";

export const dynamic = "force-dynamic";

const ZONES: Zone[] = ["NC", "NE", "NW", "SE", "SS", "SW"];

export default async function AdminReportsPage() {
  await requireRole(["admin", "auditor"]);
  const snap = await db().collection("corpsMembers").get();
  const members = docsOf<CorpsMember>(snap);
  const allocated = members.filter((m) => Boolean(m.allocation));

  // Build Origin Zone × Posted Zone matrix
  const matrix: Record<Zone, Record<Zone, number>> = {
    NC: { NC: 0, NE: 0, NW: 0, SE: 0, SS: 0, SW: 0 },
    NE: { NC: 0, NE: 0, NW: 0, SE: 0, SS: 0, SW: 0 },
    NW: { NC: 0, NE: 0, NW: 0, SE: 0, SS: 0, SW: 0 },
    SE: { NC: 0, NE: 0, NW: 0, SE: 0, SS: 0, SW: 0 },
    SS: { NC: 0, NE: 0, NW: 0, SE: 0, SS: 0, SW: 0 },
    SW: { NC: 0, NE: 0, NW: 0, SE: 0, SS: 0, SW: 0 },
  };

  let outZone = 0;
  let originViolations = 0;
  for (const m of allocated) {
    const oz = STATE_BY_CODE[m.stateOfOrigin]?.zone;
    const dz = STATE_BY_CODE[m.allocation!.stateCode]?.zone;
    if (oz && dz) {
      matrix[oz][dz] += 1;
      if (oz !== dz) outZone++;
    }
    if (m.stateOfOrigin === m.allocation!.stateCode) originViolations++;
  }

  const integrationPct = allocated.length
    ? Math.round((outZone / allocated.length) * 1000) / 10
    : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Objective 8 — Evaluation, Transparency &amp; National Equity Reports
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            National Integration Index &amp; Mobilisation Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Export CSV datasets for Chapter 4 empirical evaluation and statistical verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/api/reports/allocations"
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Export Allocations CSV
          </Link>
          <Link
            href="/api/reports/states"
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            States &amp; Camps CSV
          </Link>
          <Link
            href="/api/reports/audit"
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Audit Ledger CSV
          </Link>
        </div>
      </div>

      {/* Integrity Metrics */}
      <div className="grid sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-slate-500">Allocated Corps Members</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{allocated.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-slate-500">National Integration Index</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{integrationPct}%</div>
          <div className="text-[11px] text-slate-500">Posted outside origin geopolitical zone</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-slate-500">Home-State Exclusion Violations</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1 flex items-center gap-1.5">
            {originViolations}
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-[11px] text-slate-500">Hard constraint strictly enforced</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-slate-500">PPA Matched / Deployed</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {members.filter((m) => Boolean(m.ppa)).length} /{" "}
            {members.filter((m) => m.status === "DEPLOYED").length}
          </div>
        </div>
      </div>

      {/* Zone Mixing Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            Geopolitical Zone Mixing Matrix (Origin Zone × Deployed Zone)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstrates the 15% National Integration criterion in action: off-diagonal cells represent inter-zonal
            postings promoting national unity under the NYSC Act.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600">
                <th className="py-2.5 px-3 text-left">Origin \ Posted Zone</th>
                {ZONES.map((z) => (
                  <th key={z} className="py-2.5 px-3 text-center">
                    {z} ({ZONE_NAMES[z]})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ZONES.map((oz) => (
                <tr key={oz}>
                  <td className="py-2.5 px-3 font-bold text-slate-800">
                    {oz} — {ZONE_NAMES[oz]}
                  </td>
                  {ZONES.map((dz) => {
                    const count = matrix[oz][dz];
                    const sameZone = oz === dz;
                    return (
                      <td
                        key={dz}
                        className={`py-2.5 px-3 text-center font-mono ${
                          sameZone
                            ? "bg-slate-100 text-slate-500"
                            : count > 0
                              ? "bg-emerald-50/70 font-bold text-emerald-800"
                              : "text-slate-400"
                        }`}
                      >
                        {count}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Category Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          Mobilisation &amp; PPA Alignment by Academic Discipline Category
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {COURSE_CATEGORIES.map((cat) => {
            const totalCat = members.filter((m) => m.courseCategory === cat).length;
            const allocCat = allocated.filter((m) => m.courseCategory === cat).length;
            return (
              <div key={cat} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-900">{CATEGORY_LABEL[cat]}</div>
                <div className="text-lg font-extrabold text-emerald-700 mt-1">
                  {totalCat} <span className="text-xs font-normal text-slate-500">graduates</span>
                </div>
                <div className="text-[11px] text-slate-500">{allocCat} state-allocated</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
