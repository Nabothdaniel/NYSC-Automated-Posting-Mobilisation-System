import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { STATUS_LABEL, STATUS_ORDER, type MemberStatus } from "@/lib/types";
import { InfoHint } from "./InfoHint";

const STEP_HINTS: Record<string, string> = {
  REGISTERED: "Account created. Fill in your personal details and choose 4 preferred states.",
  PENDING_VERIFICATION: "Checking your NIN and school Senate List automatically.",
  VERIFIED: "Your school and NIN details matched! You are ready for state posting.",
  ALLOCATED: "You have been posted to a State and Orientation Camp with a Call-Up Number.",
  PPA_MATCHED: "You have been matched to a workplace (Primary Assignment) that fits your course.",
  PPA_ACCEPTED: "You accepted your workplace posting; waiting for employer confirmation.",
  DEPLOYED: "Your employer has confirmed your arrival at your place of primary assignment.",
};

export function StatusTimeline({ status }: { status: MemberStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(
    status === "FLAGGED" || status === "REJECTED"
      ? "PENDING_VERIFICATION"
      : status === "PPA_ALTERNATIVE_REQUESTED"
        ? "PPA_MATCHED"
        : status,
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center">
            Your NYSC Mobilisation Progress
            <InfoHint text="Hover or tap any step below to see what happens at each stage of your service year mobilization." />
          </h3>
          <p className="text-xs text-slate-500">
            Track where you are from registration to camp posting and workplace assignment
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            status === "FLAGGED"
              ? "bg-amber-100 text-amber-800"
              : status === "REJECTED"
                ? "bg-red-100 text-red-800"
                : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {status === "FLAGGED" ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : status === "REJECTED" ? (
            <XCircle className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {STATUS_ORDER.map((step, idx) => {
          const done = idx < currentIdx || status === "DEPLOYED";
          const active = idx === currentIdx;
          const isError = active && (status === "FLAGGED" || status === "REJECTED");

          return (
            <div
              key={step}
              title={STEP_HINTS[step]}
              className={`p-3 rounded-lg border text-xs transition-all ${
                isError
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : done
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : active
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] opacity-75">STEP {idx + 1}</span>
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : active ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : null}
              </div>
              <div className="font-semibold leading-snug">{STATUS_LABEL[step]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
