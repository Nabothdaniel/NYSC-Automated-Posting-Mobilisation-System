"use client";

import { CheckCircle2, Download, FileSpreadsheet, Plus, Upload, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { InfoHint } from "@/components/InfoHint";
import { ALL_COURSES } from "@/lib/constants/courses";
import type { CorpsMember, Institution, SenateRecord } from "@/lib/types";

export function SenateUploadClient({
  institutionId,
  institutions,
  existingRecords,
  registeredMembers,
}: {
  institutionId: string;
  institutions: Institution[];
  existingRecords: SenateRecord[];
  registeredMembers: CorpsMember[];
}) {
  const router = useRouter();
  const [selectedInst, setSelectedInst] = useState(institutionId);
  const [matricNo, setMatricNo] = useState("NSUK/CMP/22/0999");
  const [fullName, setFullName] = useState("Danjuma Musa");
  const [dob, setDob] = useState("2002-05-14");
  const [course, setCourse] = useState("Computer Science");
  const [classOfDegree] = useState("Second Class Upper");
  const [nin, setNin] = useState("99000000999");
  const [loading, setLoading] = useState(false);

  const instRecords = useMemo(
    () => existingRecords.filter((r) => r.institutionId === selectedInst),
    [existingRecords, selectedInst],
  );
  const senateMatricSet = useMemo(
    () => new Set(instRecords.map((r) => r.matricNo.toUpperCase())),
    [instRecords],
  );
  const instStudents = useMemo(
    () => registeredMembers.filter((m) => m.institutionId === selectedInst),
    [registeredMembers, selectedInst],
  );

  async function uploadRecords(records: Record<string, unknown>[], targetInst = selectedInst) {
    setLoading(true);
    try {
      const res = await fetch("/api/institution/senate-list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          institutionId: targetInst,
          records,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }
      if (data.autoVerifiedCount > 0) {
        toast.success(
          `Uploaded ${data.uploaded} record(s) and automatically VERIFIED ${data.autoVerifiedCount} waiting student(s)!`,
        );
      } else {
        toast.success(`Uploaded ${data.uploaded} graduate record(s) to the School Senate List!`);
      }
      router.refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data.map((row) => ({
          matricNo: row.matricNo || row.MatricNo || row.matric || "",
          fullName: row.fullName || row.FullName || row.name || "",
          dob: row.dob || row.DOB || "2002-01-15",
          course: row.course || row.Course || "Computer Science",
          graduationYear: Number(row.graduationYear || row.year || 2025),
          classOfDegree: row.classOfDegree || row.class || "Second Class Upper",
          nin: row.nin || row.NIN || undefined,
          stateOfOrigin: row.stateOfOrigin || undefined,
        }));
        uploadRecords(mapped);
      },
    });
  }

  function downloadSampleCsv() {
    const sample = [
      "matricNo,fullName,dob,course,graduationYear,classOfDegree,nin,stateOfOrigin",
      "NSUK/SCI/22/0801,Ibrahim Sadiq,2001-09-10,Computer Science,2025,First Class,88000000801,NA",
      "NSUK/SCI/22/0802,Okafor Chioma,2002-03-22,Microbiology,2025,Second Class Upper,88000000802,EN",
      "NSUK/LAW/22/0803,Adeyemi Tunde,2001-11-05,Law,2025,Second Class Upper,88000000803,OY",
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-senate-list.csv";
    a.click();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center">
            School Graduate List (Senate List) Upload &amp; Student Confirmation
            <InfoHint
              title="How the School Senate List Connects to Student Verification"
              text="When a university or polytechnic uploads its approved graduate list here, any student who registers with a matching Matriculation Number is automatically verified. If a student already registered before the school uploaded their name, confirming them below immediately flips their status to VERIFIED."
            />
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload your approved graduate CSV or confirm individual registered students claiming your institution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample CSV
          </button>
          <label className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Upload CSV File
            <input type="file" accept=".csv" onChange={handleCsvFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Live Interconnected Section: Registered Students Claiming This School */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Registered Students Claiming This Institution ({instStudents.length})
            </div>
            <p className="text-xs text-slate-500">
              If a student registered before their name was added to the Senate List, click{" "}
              <b>Confirm Graduate &amp; Auto-Verify</b> to add them to your Senate List and verify their account
              instantly.
            </p>
          </div>
          <select
            value={selectedInst}
            onChange={(e) => setSelectedInst(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
          >
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.code})
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th className="py-2 px-3">Student Name</th>
                <th className="py-2 px-3">Matric No.</th>
                <th className="py-2 px-3">Course</th>
                <th className="py-2 px-3">On Senate List?</th>
                <th className="py-2 px-3">NYSC Status</th>
                <th className="py-2 px-3">School Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {instStudents.map((m) => {
                const onList = senateMatricSet.has(m.matricNo.toUpperCase());
                return (
                  <tr key={m.uid}>
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {m.surname} {m.firstName}
                    </td>
                    <td className="py-2 px-3 font-mono">{m.matricNo}</td>
                    <td className="py-2 px-3">{m.course}</td>
                    <td className="py-2 px-3">
                      {onList ? (
                        <span className="text-emerald-700 font-semibold">Yes — Listed</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Not Yet Listed</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          m.status === "FLAGGED" || m.status === "REGISTERED"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {m.status === "REGISTERED" || m.status === "FLAGGED" || !onList ? (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            uploadRecords(
                              [
                                {
                                  matricNo: m.matricNo,
                                  fullName: `${m.surname} ${m.firstName}`,
                                  dob: m.dob,
                                  course: m.course,
                                  graduationYear: m.graduationYear,
                                  classOfDegree: m.classOfDegree,
                                  nin: m.nin,
                                  stateOfOrigin: m.stateOfOrigin,
                                  gender: m.gender,
                                },
                              ],
                              m.institutionId,
                            )
                          }
                          className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirm Graduate &amp; Auto-Verify
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single / Quick Add Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          uploadRecords([
            {
              matricNo,
              fullName,
              dob,
              course,
              graduationYear: 2025,
              classOfDegree,
              nin,
            },
          ]);
        }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs"
      >
        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Add New Graduate Record to Senate List
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Institution</label>
            <select
              value={selectedInst}
              onChange={(e) => setSelectedInst(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Matriculation No.</label>
            <input
              required
              value={matricNo}
              onChange={(e) => setMatricNo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name (Surname First)</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date of Birth</label>
            <input
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Course of Study</label>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {ALL_COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              NIN (Also Registers in Mock NIMC)
            </label>
            <input
              value={nin}
              onChange={(e) => setNin(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Graduate to Senate List
        </button>
      </form>

      {/* Existing Records */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="font-bold text-sm text-slate-900">
          Uploaded Senate List Records for Selected Institution ({instRecords.length})
        </div>
        <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th className="py-2 px-3">Matric No</th>
                <th className="py-2 px-3">Full Name</th>
                <th className="py-2 px-3">DOB</th>
                <th className="py-2 px-3">Course</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {instRecords.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 px-3 font-mono font-semibold">{r.matricNo}</td>
                  <td className="py-2 px-3">{r.fullName}</td>
                  <td className="py-2 px-3 font-mono">{r.dob}</td>
                  <td className="py-2 px-3">{r.course}</td>
                  <td className="py-2 px-3">{r.used ? "Matched & Verified" : "Ready"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
