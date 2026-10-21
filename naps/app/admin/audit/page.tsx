import { Scale, ShieldCheck } from "lucide-react";
import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { AuditLog } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireRole(["admin", "auditor"]);
  const snap = await db().collection("auditLogs").get();
  const logs = docsOf<AuditLog>(snap).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Accountability &amp; Non-Repudiation Ledger
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            Immutable System Audit Trail ({logs.length} Events)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Firestore rules block all client writes to <code>auditLogs</code>. Every AHP calibration, verification
            check, TOPSIS allocation explanation, and security risk update is permanently recorded here.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <ShieldCheck className="w-4 h-4" /> Append-Only Server Ledger
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 border-y border-slate-200 text-left text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor (Role)</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Audit Payload &amp; TOPSIS Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="align-top hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{log.action}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{log.actorName ?? log.actorUid}</div>
                    <div className="text-[10px] uppercase text-slate-500">{log.actorRole}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">
                    {log.targetType}:{log.targetId}
                  </td>
                  <td className="py-2.5 px-3">
                    <pre className="font-mono text-[10px] bg-slate-50 p-2 rounded border border-slate-200 max-w-xl overflow-x-auto text-slate-700">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
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
