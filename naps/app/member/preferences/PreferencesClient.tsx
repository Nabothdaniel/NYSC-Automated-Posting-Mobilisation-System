"use client";

import { AlertTriangle, CheckCircle2, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { NigeriaRiskMap } from "@/components/NigeriaRiskMap";
import { RISK_BADGE } from "@/lib/constants/risk";
import { STATE_BY_CODE, stateName } from "@/lib/constants/states";
import type { Camp, CorpsMember, StateDoc } from "@/lib/types";

export function PreferencesClient({
  initialMember,
  states,
  camps,
}: {
  initialMember: CorpsMember;
  states: StateDoc[];
  camps: Camp[];
}) {
  const router = useRouter();
  const [preferences, setPreferences] = useState<string[]>(initialMember.preferences ?? []);
  const [riskConsent, setRiskConsent] = useState<boolean>(Boolean(initialMember.riskConsent));
  const [saving, setSaving] = useState(false);

  const locked = ["ALLOCATED", "PPA_MATCHED", "PPA_ACCEPTED", "DEPLOYED"].includes(initialMember.status);
  const campByState = new Map(camps.map((c) => [c.stateCode, c]));
  const stateByCode = new Map(states.map((s) => [s.code, s]));

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

  function toggleStatePreference(code: string) {
    if (locked) return;
    if (code === initialMember.stateOfOrigin) {
      toast.error(`${stateName(code)} is your State of Origin and is strictly excluded by the NYSC Act.`);
      return;
    }
    const st = stateByCode.get(code);
    if (st?.riskLevel === "Critical" && !riskConsent) {
      toast.warning(
        `${st.name} is currently rated Critical Security Risk. Enable Informed Risk Consent below if you wish to include it.`,
      );
      return;
    }
    if (preferences.includes(code)) {
      setPreferences(preferences.filter((c) => c !== code));
    } else {
      if (preferences.length >= 4) {
        toast.info("You can select up to 4 preferred states in ranked order (1st to 4th choice).");
        return;
      }
      setPreferences([...preferences, code]);
    }
  }

  async function handleSave(andVerify: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/members/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preferences,
          riskConsent,
          submit: andVerify,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save preferences");
        setSaving(false);
        return;
      }
      toast.success(
        andVerify
          ? "Preferences saved & verification completed!"
          : "State preferences & security consent saved!",
      );
      if (andVerify) {
        router.push("/member/dashboard");
      }
      router.refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            State Preferences (20% Weight) &amp; Security Risk Consent (30% Weight)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Click up to 4 states on the interactive OpenStreetMap below or choose from the selector. Your State of Origin (
            <b>{stateName(initialMember.stateOfOrigin)}</b>) is automatically excluded.
          </p>
        </div>
        <span className="text-xs font-mono bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          Origin Zone: <b>{STATE_BY_CODE[initialMember.stateOfOrigin]?.zone}</b>
        </span>
      </div>

      {/* Interactive Map */}
      <NigeriaRiskMap
        states={mapStates}
        selectedCodes={preferences}
        excludedCode={initialMember.stateOfOrigin}
        onSelectState={toggleStatePreference}
        height={420}
      />

      {/* Ranked Choices Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Your Ranked State Preferences (1st Choice = 1.00, 2nd = 0.75, 3rd = 0.50, 4th = 0.25)
          </h2>
          {!locked && preferences.length > 0 && (
            <button
              type="button"
              onClick={() => setPreferences([])}
              className="text-xs text-red-600 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((idx) => {
            const code = preferences[idx];
            const st = code ? stateByCode.get(code) : undefined;
            const scores = ["1.00", "0.75", "0.50", "0.25"];
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  code ? "bg-emerald-50/50 border-emerald-300" : "bg-slate-50 border-dashed border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                  <span>CHOICE #{idx + 1}</span>
                  <span className="font-mono text-emerald-700">Score: {scores[idx]}</span>
                </div>
                {code && st ? (
                  <div className="space-y-1.5">
                    <div className="font-bold text-sm text-slate-900">
                      {st.name} ({st.zone})
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${RISK_BADGE[st.riskLevel]}`}
                      >
                        {st.riskLevel} Risk
                      </span>
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => toggleStatePreference(code)}
                          className="text-[11px] text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <select
                    disabled={locked}
                    value=""
                    onChange={(e) => {
                      if (e.target.value) toggleStatePreference(e.target.value);
                    }}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="">+ Select State…</option>
                    {states
                      .filter(
                        (s) =>
                          s.code !== initialMember.stateOfOrigin &&
                          !preferences.includes(s.code) &&
                          (s.riskLevel !== "Critical" || riskConsent),
                      )
                      .map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.name} ({s.zone} • {s.riskLevel})
                        </option>
                      ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {/* Critical Risk Informed Consent Box */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs space-y-2">
            <div className="font-bold text-amber-950">
              Informed Consent for Critical-Risk States (Objective 6 — Security Risk Module)
            </div>
            <p className="text-amber-900 leading-relaxed">
              By default, the NAPS allocation engine automatically excludes all states rated <b>Critical Risk</b> (e.g.
              Borno, Yobe, Zamfara) to protect corps member safety. Only check the box below if you voluntarily consent
              to be considered for deployment to a Critical-risk state (restricted to secured state capital PPAs).
            </p>
            <label className="inline-flex items-center gap-2 font-semibold text-amber-950 cursor-pointer pt-1">
              <input
                type="checkbox"
                disabled={locked}
                checked={riskConsent}
                onChange={(e) => setRiskConsent(e.target.checked)}
                className="rounded border-amber-400 text-emerald-700 focus:ring-emerald-600"
              />
              I voluntarily grant informed consent to be eligible for Critical-risk states.
            </label>
          </div>
        </div>

        {!locked && (
          <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Save Preferences Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" />
              {saving
                ? "Submitting & Running Verification…"
                : "Save & Submit Application for Verification"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
