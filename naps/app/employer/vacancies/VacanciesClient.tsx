"use client";

import { Building2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CATEGORY_LABEL, COURSE_CATEGORIES, type CourseCategory } from "@/lib/constants/courses";
import { STATES, stateName } from "@/lib/constants/states";
import type { Vacancy } from "@/lib/types";

export function VacanciesClient({
  employerId,
  vacancies,
}: {
  employerId: string;
  vacancies: Vacancy[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("Junior Software & Data Analyst");
  const [stateCode, setStateCode] = useState("LA");
  const [lga, setLga] = useState("Ikeja");
  const [capacity, setCapacity] = useState(8);
  const [categories, setCategories] = useState<CourseCategory[]>(["ICT", "Engineering"]);
  const [loading, setLoading] = useState(false);

  function toggleCategory(cat: CourseCategory) {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/employer/vacancies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create_vacancy",
          employerId,
          title,
          stateCode,
          lga,
          courseCategories: categories,
          preferredQualifications: ["B.Sc", "B.Eng", "HND"],
          capacity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not create vacancy");
        return;
      }
      toast.success(`Published PPA Vacancy: ${data.vacancy.title}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900">
          Place of Primary Assignment (PPA) Vacancy Registry
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Vacancies published here feed both the 25% Course Alignment criterion in TOPSIS state allocation and the
          post-camp Skills-Based PPA Matcher.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs"
      >
        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-600" />
          Publish New Corps Member PPA Vacancy
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Role / Position Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">State</label>
            <select
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
            >
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">LGA &amp; Slots</label>
            <div className="flex gap-2">
              <input
                required
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                placeholder="LGA"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300"
              />
              <input
                type="number"
                min={1}
                max={100}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-20 px-2 py-2 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Target Academic Discipline Categories:
          </label>
          <div className="flex flex-wrap gap-2">
            {COURSE_CATEGORIES.map((cat) => {
              const active = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    active
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {CATEGORY_LABEL[cat]}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold inline-flex items-center gap-1.5"
        >
          <Building2 className="w-4 h-4" />
          Publish PPA Vacancy
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="font-bold text-sm text-slate-900">
          Active PPA Vacancies ({vacancies.length})
        </div>
        <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th className="py-2.5 px-3">Employer</th>
                <th className="py-2.5 px-3">Role Title</th>
                <th className="py-2.5 px-3">State / LGA</th>
                <th className="py-2.5 px-3">Disciplines</th>
                <th className="py-2.5 px-3">Filled / Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vacancies.map((v) => (
                <tr key={v.id}>
                  <td className="py-2 px-3 font-semibold text-slate-900">{v.employerName}</td>
                  <td className="py-2 px-3 text-emerald-800 font-medium">{v.title}</td>
                  <td className="py-2 px-3">
                    {stateName(v.stateCode)} ({v.lga})
                  </td>
                  <td className="py-2 px-3">
                    {v.courseCategories.length > 0 ? v.courseCategories.join(", ") : "All Disciplines"}
                  </td>
                  <td className="py-2 px-3 font-mono font-semibold">
                    {v.filled} / {v.capacity}
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
