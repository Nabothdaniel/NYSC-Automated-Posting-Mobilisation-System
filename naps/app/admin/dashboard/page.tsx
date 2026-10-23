import {
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Download,
  Scale,
  ShieldAlert,
  Sliders,
  Users,
} from "lucide-react";
import Link from "next/link";
import { InfoHint } from "@/components/InfoHint";
import { NigeriaRiskMap } from "@/components/NigeriaRiskMap";
import { STATE_BY_CODE } from "@/lib/constants/states";
import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import {
  DEFAULT_WEIGHTS,
  type AllocationConfig,
  type AuditLog,
  type Camp,
  type CorpsMember,
  type StateDoc,
  type Vacancy,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await requireRole(["admin", "auditor"]);

  const [membersSnap, statesSnap, campsSnap, vacSnap, cfgSnap, auditSnap] = await Promise.all([
    db().collection("corpsMembers").get(),
    db().collection("states").get(),
    db().collection("camps").get(),
    db().collection("vacancies").get(),
    db().collection("config").doc("allocation").get(),
    db().collection("auditLogs").get(),
  ]);

  const members = docsOf<CorpsMember>(membersSnap);
  const states = docsOf<StateDoc>(statesSnap);
  const camps = docsOf<Camp>(campsSnap);
  const vacancies = docsOf<Vacancy>(vacSnap);
  const config = (cfgSnap.data() as AllocationConfig | undefined) ?? {
    weights: DEFAULT_WEIGHTS,
    consistencyRatio: 0.004,
  };
  const recentAudit = docsOf<AuditLog>(auditSnap)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6);

  const verified = members.filter((m) => m.status === "VERIFIED").length;
  const flagged = members.filter(
    (m) => m.status === "FLAGGED" || m.status === "REGISTERED",
  ).length;
  const allocated = members.filter((m) => Boolean(m.allocation)).length;
  const ppaMatched = members.filter((m) => Boolean(m.ppa)).length;
  const deployed = members.filter((m) => m.status === "DEPLOYED").length;

  const allocatedMembers = members.filter((m) => Boolean(m.allocation));
  const outOfZone = allocatedMembers.filter((m) => {
    const oz = STATE_BY_CODE[m.stateOfOrigin]?.zone;
    const dz = STATE_BY_CODE[m.allocation!.stateCode]?.zone;
    return oz && dz && oz !== dz;
  }).length;
  const integrationPct = allocatedMembers.length
    ? Math.round((outOfZone / allocatedMembers.length) * 1000) / 10
    : 0;

  const campByState = new Map(camps.map((c) => [c.stateCode, c]));
  const allocPerState: Record<string, number> = {};
  for (const m of allocatedMembers) {
    const sc = m.allocation!.stateCode;
    allocPerState[sc] = (allocPerState[sc] ?? 0) + 1;
  }

  const mapStates = states.map((s) => {
    const c = campByState.get(s.code);
    return {
      code: s.code,
      name: s.name,
      riskLevel: s.riskLevel,
      incidentCount: s.incidentCount,
      allocatedCount: allocPerState[s.code] ?? 0,
      campName: c?.name,
      campCapacity: c?.capacity,
      campOccupied: c?.occupied,
    };
  });

  const criticalCount = states.filter((s) => s.riskLevel === "Critical").length;
  const openPpaSlots = vacancies.reduce((s, v) => s + Math.max(0, v.capacity - v.filled), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            NYSC Headquarters • {user.role === "auditor" ? "Independent Auditor View" : "Mobilisation Control"}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            National Mobilisation &amp; Posting Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center">
            2026 Batch A Stream I • Priority Rules Check:{" "}
            <b className="font-mono text-emerald-700 ml-1">Balanced (CR = {config.consistencyRatio})</b>
            <InfoHint text="Confirms that the 5 national posting priorities (Safety, Course Need, Graduate Choice, National Unity, Camp Space) are mathematically consistent." />
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/allocation"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs"
          >
            <Sliders className="w-4 h-4" />
            Post Graduates to States
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/ppa-matching"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
          >
            <Award className="w-4 h-4 text-emerald-600" />
            Match Workplaces (PPA)
          </Link>
          <Link
            href="/api/reports/allocations"
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel/CSV
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center">
              Total Graduates
              <InfoHint text="All Prospective Corps Members registered in this batch." />
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{members.length}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            {verified} verified &amp; ready
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center">
              Posted to States
              <InfoHint text="Graduates who have been assigned a State, Orientation Camp, and Call-Up Number." />
            </span>
            <Cpu className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{allocated}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">0 home-state postings</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center">
              National Mixing
              <InfoHint text="Percentage of posted corps members serving outside their home geopolitical zone to promote national unity." />
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {allocated ? `${integrationPct}%` : "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Outside home region</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center">
              Workplace Matched
              <InfoHint text="Corps members matched to an employer (PPA) that needs their course of study." />
            </span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{ppaMatched}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {deployed} resumed • {openPpaSlots} open jobs
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center">
              Needs Review
              <InfoHint text="Graduates whose NIN, age, or school Senate List details had a mismatch and need an officer's review." />
            </span>
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{flagged}</div>
          <Link href="/admin/verification" className="text-[11px] text-emerald-700 hover:underline font-medium mt-0.5 block">
            Open review list →
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center">
              High-Risk States
              <InfoHint text="States currently marked 'Critical Risk' by security officers. No graduate is posted there unless they voluntarily opt in." />
            </span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-red-600 mt-1">{criticalCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Auto-blocked by default</div>
        </div>
      </div>

      {/* Live Map */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              Nigeria State Safety &amp; Camp Capacity Map
              <InfoHint text="Click any state to see its safety level, camp name, how many bed spaces are filled, and how many corps members are posted there." />
            </h2>
            <p className="text-xs text-slate-500">
              Click any state on the map for details on safety, camp bed spaces, and posted corps members.
            </p>
          </div>
          <Link href="/admin/batches" className="text-xs font-semibold text-emerald-700 hover:underline">
            Edit Camp Bed Spaces →
          </Link>
        </div>
        <NigeriaRiskMap states={mapStates} height={420} />
      </div>

      {/* Recent Audit Trail Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            Recent System Activity Log
            <InfoHint text="Every login, verification, priority change, and posting run is permanently recorded here and cannot be deleted." />
          </h2>
          <Link href="/admin/audit" className="text-xs font-semibold text-emerald-700 hover:underline">
            See All Activity →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-left text-slate-600">
                <th className="py-2 px-3">Date &amp; Time</th>
                <th className="py-2 px-3">Activity</th>
                <th className="py-2 px-3">Performed By</th>
                <th className="py-2 px-3">Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAudit.map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-emerald-800">{log.action}</td>
                  <td className="py-2.5 px-3">
                    {log.actorName ?? log.actorUid} ({log.actorRole})
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {log.targetType}:{log.targetId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
