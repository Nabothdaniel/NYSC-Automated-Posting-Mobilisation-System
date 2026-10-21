"use client";

import { ArrowLeft, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ALL_COURSES } from "@/lib/constants/courses";
import { STATES } from "@/lib/constants/states";
import { SEED_INSTITUTIONS } from "@/lib/seedData";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "Password123!",
    surname: "",
    firstName: "",
    otherNames: "",
    gender: "M" as "M" | "F",
    dob: "2002-06-15",
    nin: "",
    matricNo: "",
    institutionId: "inst_nsuk",
    stateOfOrigin: "NA",
    phone: "08035550199",
    course: "Computer Science",
    qualification: "B.Sc",
    classOfDegree: "First Class",
    graduationYear: 2025,
  });

  function fillPreVerifiedGraduate() {
    setForm({
      email: `ogamu.ibrahim.${Math.floor(Math.random() * 900 + 100)}@nsuk.edu.ng`,
      password: "Password123!",
      surname: "Ibrahim",
      firstName: "Ogamu",
      otherNames: "Iduyukpo",
      gender: "M",
      dob: "2002-06-15",
      nin: "99000000001",
      matricNo: "NSUK/CMP/22/0901",
      institutionId: "inst_nsuk",
      stateOfOrigin: "NA",
      phone: "08037502026",
      course: "Computer Science",
      qualification: "B.Sc",
      classOfDegree: "First Class",
      graduationYear: 2025,
    });
    toast.info("Pre-filled with a graduate whose NIN & NSUK Senate List record are ready for verification!");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        setLoading(false);
        return;
      }
      toast.success("Account registered! Next: select your 4 preferred states.");
      router.push("/member/preferences");
      router.refresh();
    } catch (err) {
      toast.error(String(err));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
          <button
            type="button"
            onClick={fillPreVerifiedGraduate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Fill Pre-Seeded NSUK Graduate (Ogamu Ibrahim)
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Prospective Corps Member (PCM) Mobilisation Registration
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Your NIN and Matriculation Number will be automatically verified against the NIMC registry and your
              Institution&apos;s uploaded Senate List.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Surname *</label>
                <input
                  required
                  value={form.surname}
                  onChange={(e) => setForm({ ...form, surname: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Other Names</label>
                <input
                  value={form.otherNames}
                  onChange={(e) => setForm({ ...form, otherNames: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as "M" | "F" })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State of Origin *</label>
                <select
                  value={form.stateOfOrigin}
                  onChange={(e) => setForm({ ...form, stateOfOrigin: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.zone})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  National Identification Number (NIN) *
                </label>
                <input
                  required
                  placeholder="11-digit NIN"
                  value={form.nin}
                  onChange={(e) => setForm({ ...form, nin: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Matriculation Number *
                </label>
                <input
                  required
                  placeholder="e.g. NSUK/CMP/22/0901"
                  value={form.matricNo}
                  onChange={(e) => setForm({ ...form, matricNo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Graduating Institution *
                </label>
                <select
                  value={form.institutionId}
                  onChange={(e) => setForm({ ...form, institutionId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {SEED_INSTITUTIONS.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course of Study *</label>
                <select
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {ALL_COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification *</label>
                <select
                  value={form.qualification}
                  onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {["B.Sc", "B.Eng", "MBBS", "LL.B", "B.Ed", "B.Agric", "B.A", "HND"].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? "Creating PCM Account…" : "Complete Registration & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
