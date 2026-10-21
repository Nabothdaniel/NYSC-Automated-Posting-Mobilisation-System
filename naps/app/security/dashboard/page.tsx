import { AlertTriangle, ArrowRight, MapPin, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { NigeriaRiskMap } from "@/components/NigeriaRiskMap";
import { RISK_LEVELS } from "@/lib/constants/risk";
import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { Camp, SecurityIncident, StateDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SecurityDashboardPage() {
  await requireRole(["security", "admin"]);
  const [statesSnap, campsSnap, incSnap] = await Promise.all([
    db().collection("states").get(),
    db().collection("camps").get(),
    db().collection("securityIncidents").get(),
  ]);

  const states = docsOf<StateDoc>(statesSnap);
  const camps = docsOf<Camp>(campsSnap);
  const incidents = docsOf<SecurityIncident>(incSnap);
  const campByState = new Map(camps.map((c) => [c.stateCode, c]));

  const mapStates = states.map((s) => {
    const c = campByState.get(s.code);
    return {
      code: s.code,
      name: s.name,
      riskLevel: s.riskLevel,
      incidentCount: s.incidentCount,
      campName: c?.name,
      campCapacity: c?.capacity,
      campOccupied: c?.occupied,
    };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-red-700">
            Objective 6 — National Security Threat &amp; Risk Intelligence Module
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            Real-Time State Risk Assessment &amp; Incident Command
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Security Risk carries the highest weight (<b>30%</b>) in the NAPS TOPSIS allocation engine. States rated{" "}
            <b>Critical</b> are automatically filtered out unless the corps member grants informed consent.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/security/states"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
          >
            <MapPin className="w-4 h-4" />
            Update State Risk Levels
          </Link>
          <Link
            href="/security/incidents"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Log Security Incident
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Risk Count Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        {RISK_LEVELS.map((lvl) => {
          const count = states.filter((s) => s.riskLevel === lvl).length;
          return (
            <div key={lvl} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between text-slate-500">
                <span>{lvl} Risk States</span>
                <ShieldAlert className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{count}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Nigeria OpenStreetMap Security Risk Choropleth ({incidents.length} Logged Incidents)
          </h2>
        </div>
        <NigeriaRiskMap states={mapStates} height={430} />
      </div>
    </div>
  );
}
