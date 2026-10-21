import { ArrowRight, Building2, CheckCircle2, Users } from "lucide-react";
import Link from "next/link";
import { stateName } from "@/lib/constants/states";
import { db, docsOf } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import type { CorpsMember, Employer, Vacancy } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EmployerDashboardPage() {
  const user = await requireRole(["employer", "admin"]);
  const empId = user.orgId || "emp_01";

  const [empSnap, vacSnap, membersSnap] = await Promise.all([
    db().collection("employers").doc(empId).get(),
    db().collection("vacancies").get(),
    db().collection("corpsMembers").get(),
  ]);

  const employer = empSnap.data() as Employer | undefined;
  const allVacancies = docsOf<Vacancy>(vacSnap);
  const myVacancies = allVacancies.filter((v) => v.employerId === empId);
  const matched = docsOf<CorpsMember>(membersSnap).filter((m) => Boolean(m.ppa));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Verified Place of Primary Assignment (PPA) Employer Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            {employer?.name ?? "Lagos Digital & General Hospital Hub"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sector: <b>{employer?.sector ?? "Technology"}</b> • Location:{" "}
            <b>
              {employer?.lga ?? "Ikeja"}, {stateName(employer?.stateCode ?? "LA")}
            </b>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/employer/vacancies"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
          >
            <Building2 className="w-4 h-4" />
            Manage PPA Vacancies
          </Link>
          <Link
            href="/employer/placements"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold"
          >
            Review Placements
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span>Organisation Vacancies</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{myVacancies.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span>National Active PPA Vacancies</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{allVacancies.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-slate-500">
            <span>Matched Corps Members</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{matched.length}</div>
        </div>
      </div>
    </div>
  );
}
