import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Cpu,
  Download,
  FileText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { InfoHint } from "@/components/InfoHint";
import { StatusTimeline } from "@/components/StatusTimeline";
import { RISK_BADGE } from "@/lib/constants/risk";
import { STATE_BY_CODE, stateName } from "@/lib/constants/states";
import { db } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/firebase/session";
import { FLAG_LABEL, type CorpsMember, type StateDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MemberDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ uid?: string }>;
}) {
  const user = await requireRole(["corps_member", "admin", "auditor"]);
  const sp = (await searchParams) ?? {};
  const memberId =
    user.role === "corps_member" ? user.uid : sp.uid || "usr_pcm_001";
  const snap = await db().collection("corpsMembers").doc(memberId).get();
  const member = snap.data() as CorpsMember | undefined;

  if (!member) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Profile Not Found</h2>
        <p className="text-xs text-slate-500">Please complete your graduate registration first.</p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
        >
          Go to Registration
        </Link>
      </div>
    );
  }

  let postedStateDoc: StateDoc | undefined;
  if (member.allocation?.stateCode) {
    const stSnap = await db().collection("states").doc(member.allocation.stateCode).get();
    postedStateDoc = stSnap.data() as StateDoc | undefined;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            2026 Batch A Stream I • Corps Member Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            Welcome, {member.firstName} {member.surname}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Matric No: <b className="font-mono text-slate-700">{member.matricNo}</b> • NIN:{" "}
            <b className="font-mono text-slate-700">{member.nin}</b> • School:{" "}
            <b className="text-slate-700">{member.institutionName}</b>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {member.allocation ? (
            <a
              href={`/api/letters/callup/${member.uid}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs"
            >
              <Download className="w-4 h-4" />
              Download Call-Up Letter (PDF)
            </a>
          ) : (
            <Link
              href="/member/profile"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs"
            >
              Verify My Details
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <StatusTimeline status={member.status} />

      {/* Newly Registered Alert */}
      {member.status === "REGISTERED" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-blue-950 space-y-1">
            <div className="font-bold text-sm">
              Next Step: Choose Your 4 Preferred States &amp; Submit for Verification
            </div>
            <p className="text-blue-800">
              Your account is registered and visible to NYSC Admin. Select up to 4 preferred states and click{" "}
              <b>Save &amp; Submit Application for Verification</b> to run your NIMC + School Senate List check.
            </p>
          </div>
          <Link
            href="/member/preferences"
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            Choose States &amp; Submit
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Flagged Alert if any */}
      {member.status === "FLAGGED" && member.flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <div className="font-bold text-sm">Your Registration Needs a Quick Officer Review</div>
            <ul className="list-disc list-inside space-y-0.5">
              {member.flags.map((f) => (
                <li key={f}>{FLAG_LABEL[f]}</li>
              ))}
            </ul>
            <p className="pt-1 text-amber-800">
              An NYSC verification officer will check your documents and approve your record so you can be included in
              state posting.
            </p>
          </div>
        </div>
      )}

      {/* 3 Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Card 1: Credentials & Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                1. My Details &amp; Choices
                <InfoHint text="Your course of study and 4 preferred states are used to find the best state and workplace for your service year." />
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xs space-y-1.5 text-slate-600">
              <div>
                Course: <b className="text-slate-900">{member.course}</b> ({member.qualification})
              </div>
              <div>
                Field: <b className="text-emerald-700">{member.courseCategory}</b>
              </div>
              <div>
                Home State (Excluded):{" "}
                <b className="text-slate-900">
                  {stateName(member.stateOfOrigin)} ({STATE_BY_CODE[member.stateOfOrigin]?.zone})
                </b>
              </div>
              <div>
                Chosen States:{" "}
                <b className="text-slate-900">
                  {member.preferences.length > 0
                    ? member.preferences.map((c, i) => `${i + 1}. ${stateName(c)}`).join(", ")
                    : "None chosen yet"}
                </b>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link href="/member/profile" className="font-semibold text-emerald-700 hover:underline">
              My Details
            </Link>
            <Link href="/member/preferences" className="font-semibold text-emerald-700 hover:underline">
              Choose States →
            </Link>
          </div>
        </div>

        {/* Card 2: State & Camp Allocation */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                2. My State &amp; Camp Posting
                <InfoHint text="Shows the state and orientation camp you were posted to and how well it matched your safety, course, and preferences." />
              </span>
              <Cpu className="w-4 h-4 text-emerald-600" />
            </div>
            {member.allocation ? (
              <div className="space-y-2 text-xs">
                <div className="text-base font-extrabold text-emerald-800">
                  {stateName(member.allocation.stateCode)} ({STATE_BY_CODE[member.allocation.stateCode]?.zone} Zone)
                </div>
                <div className="text-slate-700 font-medium">{member.allocation.campName}</div>
                <div className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block font-bold">
                  {member.allocation.callUpNo}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {postedStateDoc && (
                    <span
                      className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                        RISK_BADGE[postedStateDoc.riskLevel]
                      }`}
                    >
                      {postedStateDoc.riskLevel} Risk
                    </span>
                  )}
                  <span className="text-slate-500">
                    Match Score: <b className="text-slate-800">{Math.round(member.allocation.score * 100)}%</b>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                Waiting for NYSC HQ to publish postings for your batch. Once published, your assigned state, orientation
                camp, and Call-Up Number will appear here.
              </p>
            )}
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link href="/member/allocation" className="font-semibold text-emerald-700 hover:underline">
              See Why I Was Posted Here →
            </Link>
          </div>
        </div>

        {/* Card 3: Place of Primary Assignment (PPA) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                3. My Workplace (PPA)
                <InfoHint text="Place of Primary Assignment: the school, hospital, ministry, or company where you will serve after orientation camp." />
              </span>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>
            {member.ppa ? (
              <div className="space-y-1.5 text-xs">
                <div className="font-bold text-sm text-slate-900">{member.ppa.employerName}</div>
                <div className="text-emerald-700 font-semibold">{member.ppa.title}</div>
                <div className="text-slate-600">Location: {member.ppa.lga} LGA</div>
                <div className="text-slate-500">
                  Course Match: <b className="text-slate-800">{Math.round(member.ppa.score * 100)}%</b>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                After state posting, you will be matched to a verified employer in your posted state that needs your{" "}
                <b>{member.course}</b> qualification.
              </p>
            )}
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link href="/member/ppa" className="font-semibold text-emerald-700 hover:underline">
              View Workplace Details →
            </Link>
            <Link href="/member/letters" className="font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> Letters
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
