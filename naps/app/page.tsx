import {
  ArrowRight,
  Award,
  CheckCircle2,
  Cpu,
  Lock,
  MapPin,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { InfoHint } from "@/components/InfoHint";
import { NigeriaRiskMap } from "@/components/NigeriaRiskMap";
import { db, docsOf } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/firebase/session";
import {
  CRITERION_LABEL,
  DEFAULT_WEIGHTS,
  ROLE_HOME,
  type AllocationConfig,
  type Camp,
  type CorpsMember,
  type Criterion,
  type StateDoc,
  type Vacancy,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const CRITERION_HINTS: Record<Criterion, string> = {
  security: "Safer states get higher priority. High-danger (Critical) states are blocked unless a graduate voluntarily opts in.",
  course: "Favours states where schools, hospitals, ministries, or companies have open jobs for your course of study.",
  preference: "Rewards your 1st, 2nd, 3rd, and 4th choice states.",
  integration: "Promotes national unity by encouraging postings outside your home region while keeping your home state excluded.",
  capacity: "Checks how many bed spaces are left in each state's NYSC orientation camp so no camp is overcrowded.",
};

export default async function HomePage() {
  const sessionUser = await getSessionUser();
  const [statesSnap, campsSnap, membersSnap, vacSnap, cfgSnap] = await Promise.all([
    db().collection("states").get(),
    db().collection("camps").get(),
    db().collection("corpsMembers").get(),
    db().collection("vacancies").get(),
    db().collection("config").doc("allocation").get(),
  ]);

  const states = docsOf<StateDoc>(statesSnap);
  const camps = docsOf<Camp>(campsSnap);
  const members = docsOf<CorpsMember>(membersSnap);
  const vacancies = docsOf<Vacancy>(vacSnap);
  const weights = (cfgSnap.data() as AllocationConfig | undefined)?.weights ?? DEFAULT_WEIGHTS;

  const campByState = new Map(camps.map((c) => [c.stateCode, c]));
  const allocPerState: Record<string, number> = {};
  for (const m of members) {
    if (m.allocation?.stateCode) {
      allocPerState[m.allocation.stateCode] = (allocPerState[m.allocation.stateCode] ?? 0) + 1;
    }
  }

  const mapStates = states.map((s) => {
    const c = campByState.get(s.code);
    return {
      code: s.code,
      name: s.name,
      riskLevel: s.riskLevel,
      incidentCount: s.incidentCount,
      allocatedCount: allocPerState[s.code] ?? 0,
      campName: c?.name,
      campCapacity: c?.capacity,
      campOccupied: c?.occupied,
    };
  });

  const verifiedCount = members.filter(
    (m) => m.status !== "REGISTERED" && m.status !== "FLAGGED" && m.status !== "REJECTED",
  ).length;
  const allocatedCount = members.filter((m) => Boolean(m.allocation)).length;
  const totalPpaSlots = vacancies.reduce((s, v) => s + v.capacity, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-emerald-950 text-white border-b border-emerald-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-lg">
              NY
            </div>
            <div>
              <div className="font-bold text-base tracking-tight">
                NAPS — NYSC Automated Posting Portal
              </div>
              <div className="text-xs text-emerald-300">
                National Youth Service Corps • Fair, Safe &amp; Transparent Posting
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/verify/NYSC%2FNSUK%2F26AI%2F00001"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Check Call-Up Letter
            </Link>
            {sessionUser ? (
              <Link
                href={ROLE_HOME[sessionUser.role]}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 transition-colors"
              >
                Open My Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-emerald-900"
                >
                  Sign In / Demo Accounts
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-emerald-950"
                >
                  Graduate Registration
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-emerald-950 via-emerald-900 to-slate-900 text-white py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-medium">
              <Cpu className="w-3.5 h-3.5" />
              100% Automated • No Favouritism or Manual Tampering
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Fair, Safe &amp; Course-Matched NYSC Posting for Every Graduate.
            </h1>
            <p className="text-emerald-100/85 text-base sm:text-lg leading-relaxed max-w-2xl">
              One simple portal from registration to camp and workplace assignment: your school and NIN details are
              verified automatically, unsafe areas are avoided, your course of study is matched to real employers, and
              every graduate can see <strong className="text-white">why</strong> they were posted to their state.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm shadow-lg"
              >
                Sign In or Try Demo Roles
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20"
              >
                New Graduate Registration
              </Link>
            </div>
          </div>

          {/* Live Transparency Card */}
          <div className="lg:col-span-5 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300 flex items-center">
                How States Are Scored for Each Graduate
                <InfoHint text="Every eligible state is scored using these 5 national priorities (set via AHP and ranked via TOPSIS). Hover the ? icon next to each item to see how it works." />
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 font-mono">
                100% Total
              </span>
            </div>
            <div className="space-y-3">
              {(Object.entries(weights) as [Criterion, number][]).map(([crit, w]) => (
                <div key={crit}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-white flex items-center">
                      {CRITERION_LABEL[crit]}
                      <InfoHint text={CRITERION_HINTS[crit]} />
                    </span>
                    <span className="font-mono text-emerald-300">{Math.round(w * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${Math.round(w * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
              <div className="bg-black/20 rounded-xl p-2.5">
                <div className="text-xl font-bold text-white">{verifiedCount}</div>
                <div className="text-[11px] text-emerald-200/80">Verified Graduates</div>
              </div>
              <div className="bg-black/20 rounded-xl p-2.5">
                <div className="text-xl font-bold text-emerald-400">{allocatedCount}</div>
                <div className="text-[11px] text-emerald-200/80">Posted to States</div>
              </div>
              <div className="bg-black/20 rounded-xl p-2.5">
                <div className="text-xl font-bold text-white">{totalPpaSlots}</div>
                <div className="text-[11px] text-emerald-200/80">Employer Job Slots</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live OpenStreetMap Risk & Capacity Map */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-emerald-600" />
              Live Nigeria State Safety &amp; Camp Space Map
              <InfoHint text="Click any state on the map to see its current safety level, orientation camp name, available camp bed spaces, and how many corps members have been posted there." />
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Click any state to view its safety rating and orientation camp capacity. Nobody is ever posted to their
              home state, and Critical-risk states are blocked unless a graduate voluntarily opts in.
            </p>
          </div>
          <Link
            href="/login"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            Security Officer? Sign in to update state safety levels →
          </Link>
        </div>

        <NigeriaRiskMap states={mapStates} height={450} />
      </section>

      {/* System Architecture Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">1. Automatic School &amp; NIN Check</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Schools upload their approved graduate list (Senate List). When a graduate registers, the system checks
              their Matric Number, NIN, date of birth, and age limit (under 30) in seconds.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">2. Clear Reason for Every Posting</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No more mystery postings or lobbying. Every graduate can view the exact score breakdown showing why their
              assigned state was the best match for their safety, course, and preferences.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900">3. Course-Matched Workplace (PPA)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hospitals, schools, ministries, and companies post real job openings. Corps members are matched to
              workplaces that actually need what they studied in school.
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-auto bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            NAPS — Development and Automated NYSC Posting System • B.Sc. Computer Science Project (NSUK, 2026)
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <Lock className="w-3.5 h-3.5" /> Simulated Records Only (Privacy Protected)
            </span>
            <Link href="/login" className="hover:text-white underline">
              Staff &amp; Graduate Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
