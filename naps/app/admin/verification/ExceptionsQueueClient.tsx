"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InfoHint } from "@/components/InfoHint";
import { stateName } from "@/lib/constants/states";
import { FLAG_LABEL, type CorpsMember } from "@/lib/types";

type TabFilter = "NEEDS_ACTION" | "VERIFIED" | "POSTED" | "REJECTED" | "ALL";

const QUICK_REASONS = [
  "Verified physical certificate & NIN slip at NYSC Mobilization Desk",
  "Foreign university degree cleared by Federal Ministry of Education",
  "School Senate List confirmed via Institution Mobilization Officer",
  "Date of birth / age exemption certificate verified",
];

export function ExceptionsQueueClient({
  allMembers,
  senateMatrics,
  nimcNins,
  readOnly,
}: {
  allMembers: CorpsMember[];
  senateMatrics: string[];
  nimcNins: string[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabFilter>("NEEDS_ACTION");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loadingUid, setLoadingUid] = useState<string | null>(null);

  const senateSet = useMemo(() => new Set(senateMatrics.map((m) => m.toUpperCase())), [senateMatrics]);
  const nimcSet = useMemo(() => new Set(nimcNins), [nimcNins]);

  const counts = useMemo(() => {
    const needsAction = allMembers.filter(
      (m) => m.status === "FLAGGED" || m.status === "REGISTERED",
    ).length;
    const verified = allMembers.filter((m) => m.status === "VERIFIED").length;
    const posted = allMembers.filter((m) =>
      ["ALLOCATED", "PPA_MATCHED", "PPA_ACCEPTED", "PPA_ALTERNATIVE_REQUESTED", "DEPLOYED"].includes(
        m.status,
      ),
    ).length;
    const rejected = allMembers.filter((m) => m.status === "REJECTED").length;
    return { needsAction, verified, posted, rejected, all: allMembers.length };
  }, [allMembers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMembers
      .filter((m) => {
        if (tab === "NEEDS_ACTION") return m.status === "FLAGGED" || m.status === "REGISTERED";
        if (tab === "VERIFIED") return m.status === "VERIFIED";
        if (tab === "POSTED")
          return [
            "ALLOCATED",
            "PPA_MATCHED",
            "PPA_ACCEPTED",
            "PPA_ALTERNATIVE_REQUESTED",
            "DEPLOYED",
          ].includes(m.status);
        if (tab === "REJECTED") return m.status === "REJECTED";
        return true;
      })
      .filter((m) => {
        if (!q) return true;
        return (
          m.surname.toLowerCase().includes(q) ||
          m.firstName.toLowerCase().includes(q) ||
          m.matricNo.toLowerCase().includes(q) ||
          m.nin.toLowerCase().includes(q) ||
          m.institutionName.toLowerCase().includes(q) ||
          m.course.toLowerCase().includes(q)
        );
      });
  }, [allMembers, tab, search]);

  async function decide(uid: string, decision: "approve" | "reject" | "recheck") {
    if (decision !== "recheck") {
      const note = (notes[uid] || "").trim();
      if (note.length < 5) {
        toast.error(
          "Please enter a short approval/rejection reason (or click one of the quick reason buttons below).",
        );
        return;
      }
    }
    setLoadingUid(uid);
    try {
      const res = await fetch("/api/admin/verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid, decision, note: notes[uid] }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      if (decision === "recheck") {
        if (data.passed) {
          toast.success("Auto-check passed! Student is now VERIFIED and queued for posting.");
        } else {
          toast.warning(`Auto-check flagged: ${(data.flags || []).join(", ")}`);
        }
      } else if (decision === "approve") {
        toast.success("Student approved and moved to VERIFIED!");
      } else {
        toast.success("Student registration rejected and logged to audit trail.");
      }
      router.refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoadingUid(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 flex items-center">
              Student Submissions, Identity Verification &amp; Approval Center
              <InfoHint
                title="How Student Verification Works"
                text="When a student registers or submits their profile, the system checks their NIN against NIMC and their Matric No against their university's uploaded Senate List. Any student who is newly registered or flagged appears here so the Admin can inspect their submission, run an auto-check, or manually approve/reject them."
              />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Review &amp; Approve Prospective Corps Members ({allMembers.length} Total)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              View every student submission, check their NIN and School Senate List match, inspect their 4 preferred
              states, and approve or re-verify them for state posting.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, Matric No, NIN, school…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setTab("NEEDS_ACTION")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === "NEEDS_ACTION"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Needs Admin Review / Approval ({counts.needsAction})
          </button>
          <button
            type="button"
            onClick={() => setTab("VERIFIED")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === "VERIFIED"
                ? "bg-emerald-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified &amp; Ready for Posting ({counts.verified})
          </button>
          <button
            type="button"
            onClick={() => setTab("POSTED")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === "POSTED"
                ? "bg-emerald-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Posted &amp; Deployed ({counts.posted})
          </button>
          <button
            type="button"
            onClick={() => setTab("REJECTED")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === "REJECTED"
                ? "bg-red-700 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Rejected ({counts.rejected})
          </button>
          <button
            type="button"
            onClick={() => setTab("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            All Students ({counts.all})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No students match the selected filter. Switch to <b>All Students</b> above to see everyone.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => {
            const hasNimc = nimcSet.has(m.nin);
            const hasSenate = senateSet.has(m.matricNo.toUpperCase());
            const canApproveOrReject =
              !readOnly && ["REGISTERED", "FLAGGED", "REJECTED", "VERIFIED"].includes(m.status);

            return (
              <div
                key={m.uid}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-base text-slate-900">
                        {m.surname.toUpperCase()}, {m.firstName} {m.otherNames || ""}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          m.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : m.status === "FLAGGED"
                              ? "bg-amber-100 text-amber-800"
                              : m.status === "REGISTERED"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {m.status === "REGISTERED" ? "NEW SUBMISSION (AWAITING CHECK)" : m.status}
                      </span>
                      {m.isForeignTrained && (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-semibold">
                          Foreign-Trained Graduate
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      NIN: <b className="font-mono text-slate-800">{m.nin}</b> • Matric No:{" "}
                      <b className="font-mono text-slate-800">{m.matricNo}</b> • DOB:{" "}
                      <b className="text-slate-700">{m.dob}</b> • Gender: <b>{m.gender}</b> • State of
                      Origin: <b className="text-slate-800">{stateName(m.stateOfOrigin)}</b>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      School: <b>{m.institutionName}</b> • Course:{" "}
                      <b>
                        {m.course} ({m.qualification}, {m.classOfDegree})
                      </b>{" "}
                      • Email: <span className="font-mono">{m.email}</span>
                    </div>
                  </div>

                  {/* Quick Portal Inspection Links */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/member/dashboard?uid=${encodeURIComponent(m.uid)}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                    >
                      Inspect Student View
                    </Link>
                    {m.allocation && (
                      <a
                        href={`/api/letters/callup/${encodeURIComponent(m.uid)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Call-Up PDF ({m.allocation.callUpNo})
                      </a>
                    )}
                  </div>
                </div>

                {/* Live Interconnected Verification Checklist Badges */}
                <div className="grid sm:grid-cols-4 gap-2.5 text-xs">
                  <div
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      hasNimc
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] uppercase font-semibold opacity-75">
                        1. NIMC Identity Check
                      </div>
                      <div className="font-bold mt-0.5">
                        {hasNimc ? "NIN Found in NIMC" : "NIN Not in Mock NIMC"}
                      </div>
                    </div>
                    <CheckCircle2
                      className={`w-4 h-4 ${hasNimc ? "text-emerald-600" : "text-amber-600"}`}
                    />
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      hasSenate
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] uppercase font-semibold opacity-75">
                        2. School Senate List
                      </div>
                      <div className="font-bold mt-0.5">
                        {hasSenate ? "Matric Confirmed by School" : "Not Yet on School List"}
                      </div>
                    </div>
                    <CheckCircle2
                      className={`w-4 h-4 ${hasSenate ? "text-emerald-600" : "text-amber-600"}`}
                    />
                  </div>

                  <div className="p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-500">
                        3. Uploaded Documents
                      </div>
                      <div className="font-bold mt-0.5">
                        {m.hasPhoto && m.hasCertificate
                          ? "Photo + Certificate Attached"
                          : "Missing Upload"}
                      </div>
                    </div>
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  </div>

                  <div className="p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-800">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">
                      4. Student&apos;s Chosen States
                    </div>
                    <div className="font-bold mt-0.5 truncate">
                      {m.preferences.length > 0
                        ? m.preferences.map((c, i) => `${i + 1}. ${stateName(c)}`).join(", ")
                        : "No states selected yet"}
                    </div>
                  </div>
                </div>

                {/* Flags or Review Notes */}
                {m.flags.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Why This Submission Was Flagged for Admin Review:
                    </div>
                    <ul className="list-disc list-inside">
                      {m.flags.map((f) => (
                        <li key={f}>
                          <b>{f}:</b> {FLAG_LABEL[f]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.reviewNote && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950">
                    <b>Admin Review Note:</b> {m.reviewNote}
                  </div>
                )}

                {/* Posting Summary if Allocated */}
                {m.allocation && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      Posted State: <b>{stateName(m.allocation.stateCode)}</b> ({m.allocation.campName})
                      • Call-Up No: <b className="font-mono">{m.allocation.callUpNo}</b> • Match Score:{" "}
                      <b className="font-mono text-emerald-700">{m.allocation.score}</b>
                    </div>
                    {m.ppa && (
                      <div>
                        Workplace (PPA): <b>{m.ppa.employerName}</b> ({m.ppa.title})
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Approval / Auto-Check Controls */}
                {canApproveOrReject && (
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Quick Reason Presets:
                      </span>
                      {QUICK_REASONS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setNotes({ ...notes, [m.uid]: preset })}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] text-slate-700 border border-slate-200 transition-colors"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <input
                        placeholder="Enter approval or rejection note (or click a quick preset above)…"
                        value={notes[m.uid] ?? ""}
                        onChange={(e) => setNotes({ ...notes, [m.uid]: e.target.value })}
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={loadingUid === m.uid}
                          onClick={() => decide(m.uid, "recheck")}
                          className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                          Run Auto-Check
                        </button>
                        {m.status !== "VERIFIED" && (
                          <button
                            type="button"
                            disabled={loadingUid === m.uid}
                            onClick={() => decide(m.uid, "approve")}
                            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approve → VERIFIED
                          </button>
                        )}
                        {m.status !== "REJECTED" && (
                          <button
                            type="button"
                            disabled={loadingUid === m.uid}
                            onClick={() => decide(m.uid, "reject")}
                            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
