import { ArrowRight, CheckCircle2, FileSpreadsheet, GraduationCap } from "lucide-react";
import Link from "next/link";
import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import { SEED_INSTITUTIONS } from "@/lib/seedData";
import type { SenateRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InstitutionDashboardPage() {
  const user = await requireRole(["institution", "admin"]);
  const instId = user.orgId || "inst_nsuk";
  const inst = SEED_INSTITUTIONS.find((i) => i.id === instId) ?? SEED_INSTITUTIONS[0]!;

  const snap = await db().collection("senateLists").get();
  const allRecords = docsOf<SenateRecord>(snap);
  const myRecords = allRecords.filter((r) => r.institutionId === inst.id);
  const verifiedUsed = myRecords.filter((r) => r.used).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Accredited Institution Mobilisation Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            {inst.name} ({inst.code})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload approved Senate Graduate Lists to enable instant automated verification of Prospective Corps Members.
          </p>
        </div>

        <Link
          href="/institution/senate-list"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Upload Senate List (CSV)
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span>Uploaded Institution Graduates</span>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{myRecords.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span>Matched &amp; Claimed by PCMs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{verifiedUsed}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span>Total National Senate Records</span>
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{allRecords.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Recent Senate List Records for {inst.code}
        </h2>
        <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Matric No.</th>
                <th className="py-2.5 px-3">Full Name</th>
                <th className="py-2.5 px-3">DOB</th>
                <th className="py-2.5 px-3">Course</th>
                <th className="py-2.5 px-3">Class of Degree</th>
                <th className="py-2.5 px-3">Year</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myRecords.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 px-3 font-mono font-semibold text-slate-900">{r.matricNo}</td>
                  <td className="py-2 px-3 font-medium">{r.fullName}</td>
                  <td className="py-2 px-3 font-mono text-slate-500">{r.dob}</td>
                  <td className="py-2 px-3">{r.course}</td>
                  <td className="py-2 px-3">{r.classOfDegree}</td>
                  <td className="py-2 px-3 font-mono">{r.graduationYear}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        r.used ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {r.used ? "Verified by PCM" : "Available"}
                    </span>
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
