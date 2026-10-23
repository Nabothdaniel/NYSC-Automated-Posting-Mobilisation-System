"use client";

import { FileCheck2, ShieldCheck, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ALL_COURSES } from "@/lib/constants/courses";
import { STATES } from "@/lib/constants/states";
import { FLAG_LABEL, type CorpsMember, type Institution } from "@/lib/types";

export function MemberProfileForm({
  initialMember,
  institutions,
}: {
  initialMember: CorpsMember;
  institutions: Institution[];
}) {
  const router = useRouter();
  const [member, setMember] = useState<CorpsMember>(initialMember);
  const [loading, setLoading] = useState(false);

  const locked = ["ALLOCATED", "PPA_MATCHED", "PPA_ACCEPTED", "DEPLOYED"].includes(member.status);

  async function saveProfile(submitForVerification: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/members/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...member,
          submit: submitForVerification,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not update profile");
        setLoading(false);
        return;
      }
      setMember(data.member);
      if (submitForVerification) {
        if (data.verification?.passed) {
          toast.success("NIMC + Senate List Verification Passed! Status: VERIFIED");
        } else {
          toast.warning("Profile submitted with verification flags queued for Admin review.");
        }
        router.push("/member/dashboard");
      } else {
        toast.success("Bio-data saved.");
      }
      router.refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bio-Data, Identity &amp; Academic Credentials</h1>
          <p className="text-xs text-slate-500 mt-1">
            Objective 4: Automated cross-verification against Institution Senate Lists and NIMC Identity Registry.
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          Status: {member.status}
        </span>
      </div>

      {member.flags.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1">
          <div className="font-bold">Active Verification Flags:</div>
          <ul className="list-disc list-inside">
            {member.flags.map((f) => (
              <li key={f}>{FLAG_LABEL[f]}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Surname</label>
            <input
              disabled={locked}
              value={member.surname}
              onChange={(e) => setMember({ ...member, surname: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
            <input
              disabled={locked}
              value={member.firstName}
              onChange={(e) => setMember({ ...member, firstName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Other Names</label>
            <input
              disabled={locked}
              value={member.otherNames || ""}
              onChange={(e) => setMember({ ...member, otherNames: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              disabled={locked}
              value={member.dob}
              onChange={(e) => setMember({ ...member, dob: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
            <select
              disabled={locked}
              value={member.gender}
              onChange={(e) => setMember({ ...member, gender: e.target.value as "M" | "F" })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white disabled:bg-slate-100"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              State of Origin (Excluded from Posting)
            </label>
            <select
              disabled={locked}
              value={member.stateOfOrigin}
              onChange={(e) => setMember({ ...member, stateOfOrigin: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white disabled:bg-slate-100"
            >
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.zone})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">NIN (NIMC Registry)</label>
            <input
              disabled={locked}
              value={member.nin}
              onChange={(e) => setMember({ ...member, nin: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Matriculation Number</label>
            <input
              disabled={locked}
              value={member.matricNo}
              onChange={(e) => setMember({ ...member, matricNo: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              disabled={locked}
              value={member.phone}
              onChange={(e) => setMember({ ...member, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Graduating Institution</label>
            <select
              disabled={locked}
              value={member.institutionId}
              onChange={(e) => setMember({ ...member, institutionId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white disabled:bg-slate-100"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Course of Study</label>
            <select
              disabled={locked}
              value={member.course}
              onChange={(e) => setMember({ ...member, course: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white disabled:bg-slate-100"
            >
              {ALL_COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Document Uploads */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">Passport Photograph (Biometric)</div>
                <div className="text-slate-500">
                  {member.hasPhoto ? "Verified white-background passport attached" : "Not uploaded"}
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                setMember({ ...member, hasPhoto: true });
                toast.success("Passport photo attached");
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold hover:bg-slate-100 flex items-center gap-1"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              {member.hasPhoto ? "Replace" : "Upload"}
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <div className="text-xs">
                <div className="font-semibold text-slate-900">Statement of Result / Degree Certificate</div>
                <div className="text-slate-500">
                  {member.hasCertificate ? "Signed institution certificate attached" : "Not uploaded"}
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                setMember({ ...member, hasCertificate: true });
                toast.success("Degree certificate attached");
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold hover:bg-slate-100 flex items-center gap-1"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              {member.hasCertificate ? "Replace" : "Upload"}
            </button>
          </div>
        </div>

        {!locked && (
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => saveProfile(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => saveProfile(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading
                ? "Running NIMC & Senate Checks…"
                : "Run Automated NIMC + Senate List Verification"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
