/**
 * NAPS State Allocation Engine.
 *
 * Pipeline (per batch run):
 *  1. Seeded shuffle of verified members (fair + reproducible order).
 *  2. For each member, build candidate states and apply HARD constraints:
 *       - state of origin is never a candidate (NYSC Act — no override)
 *       - Critical-risk states only if the member gave informed risk consent
 *       - states whose orientation camp is full are skipped
 *  3. Score every candidate on 5 benefit criteria (0..1).
 *  4. Rank candidates with TOPSIS using AHP-derived weights.
 *  5. Assign the best state, reserve a camp slot, generate a call-up number.
 *  6. Return a full explanation for the audit trail.
 *
 * This module is pure (no I/O) so it can be unit-tested and replayed from a seed.
 */
import { RISK_SCORE } from "../constants/risk";
import { STATE_BY_CODE, ZONE_REGION, type RiskLevel, type Zone } from "../constants/states";
import type { CourseCategory } from "../constants/courses";
import { CRITERIA, type CandidateExplanation, type Weights } from "../types";
import { seededShuffle } from "./seededRandom";
import { topsis } from "./topsis";

export interface AllocMemberInput {
  uid: string;
  stateOfOrigin: string;
  courseCategory: CourseCategory;
  preferences: string[];
  riskConsent: boolean;
  institutionCode: string;
}

export interface AllocStateInput {
  code: string;
  riskLevel: RiskLevel;
}

export interface AllocCampInput {
  id: string;
  stateCode: string;
  name: string;
  capacity: number;
  occupied: number;
}

export interface AllocationInput {
  members: AllocMemberInput[];
  states: AllocStateInput[];
  camps: AllocCampInput[];
  /** Open PPA vacancy slots: demand[stateCode][category] = count */
  demand: Record<string, Partial<Record<CourseCategory, number>>>;
  weights: Weights;
  seed: number;
  /** Call-up number prefix parts */
  batchCode: string; // e.g. "26A"
  /** Existing sequence counters per institution code (to continue numbering). */
  counters?: Record<string, number>;
}

export interface AllocationDecision {
  uid: string;
  stateCode: string;
  campId: string;
  campName: string;
  callUpNo: string;
  closeness: number;
  rank: number; // 1-based position in the processing queue
  preferenceRank: number | null; // 1..4 if the state was one of the preferences
  candidates: CandidateExplanation[]; // sorted best → worst
  excluded: { stateCode: string; reason: "STATE_OF_ORIGIN" | "CRITICAL_NO_CONSENT" | "CAMP_FULL" }[];
}

export interface AllocationStats {
  total: number;
  allocated: number;
  unallocated: number;
  firstChoicePct: number;
  anyPreferencePct: number;
  integrationIndexPct: number; // % posted outside origin geopolitical zone
  crossRegionPct: number; // % posted across North/South divide
  avgCloseness: number;
  perState: Record<string, number>;
  originViolations: number; // must always be 0
  criticalWithoutConsent: number; // must always be 0
  campOverflows: number; // must always be 0
}

export interface AllocationResult {
  seed: number;
  weights: Weights;
  decisions: AllocationDecision[];
  unallocated: { uid: string; reason: string }[];
  campOccupancy: Record<string, number>; // campId → occupied after run
  counters: Record<string, number>;
  stats: AllocationStats;
}

export const PREFERENCE_SCORES = [1, 0.75, 0.5, 0.25];

export function preferenceScore(preferences: string[], stateCode: string): number {
  const idx = preferences.indexOf(stateCode);
  return idx >= 0 && idx < PREFERENCE_SCORES.length ? PREFERENCE_SCORES[idx] : 0;
}

/** National Integration: cultural distance between origin and destination zones. */
export function integrationScore(originZone: Zone, destZone: Zone): number {
  if (originZone === destZone) return 0.33;
  if (ZONE_REGION[originZone] === ZONE_REGION[destZone]) return 0.66;
  return 1;
}

export function formatCallUpNo(instCode: string, batchCode: string, seq: number) {
  return `NYSC/${instCode}/${batchCode}/${String(seq).padStart(5, "0")}`;
}

export function runAllocation(input: AllocationInput): AllocationResult {
  const { weights, seed } = input;
  const w = CRITERIA.map((c) => weights[c]);

  const campsByState = new Map<string, AllocCampInput & { remaining: number }>();
  for (const c of input.camps) {
    campsByState.set(c.stateCode, { ...c, remaining: Math.max(0, c.capacity - c.occupied) });
  }
  const riskByState = new Map(input.states.map((s) => [s.code, s.riskLevel]));
  // Mutable copy of demand (decremented as members are posted, so demand self-balances).
  const demand: Record<string, Partial<Record<CourseCategory, number>>> = JSON.parse(
    JSON.stringify(input.demand ?? {}),
  );
  const counters: Record<string, number> = { ...(input.counters ?? {}) };

  const queue = seededShuffle(
    [...input.members].sort((a, b) => a.uid.localeCompare(b.uid)), // stable base order
    seed,
  );

  const decisions: AllocationDecision[] = [];
  const unallocated: { uid: string; reason: string }[] = [];

  queue.forEach((m, qi) => {
    const origin = STATE_BY_CODE[m.stateOfOrigin];
    const excluded: AllocationDecision["excluded"] = [];
    const candidates: string[] = [];

    for (const s of input.states) {
      if (s.code === m.stateOfOrigin) {
        excluded.push({ stateCode: s.code, reason: "STATE_OF_ORIGIN" });
        continue;
      }
      if (s.riskLevel === "Critical" && !m.riskConsent) {
        excluded.push({ stateCode: s.code, reason: "CRITICAL_NO_CONSENT" });
        continue;
      }
      const camp = campsByState.get(s.code);
      if (!camp || camp.remaining <= 0) {
        excluded.push({ stateCode: s.code, reason: "CAMP_FULL" });
        continue;
      }
      candidates.push(s.code);
    }

    if (candidates.length === 0) {
      unallocated.push({ uid: m.uid, reason: "No eligible state (all camps full or excluded)" });
      return;
    }

    // Course alignment normaliser: highest open demand for this category among candidates
    const maxDemand = Math.max(0, ...candidates.map((c) => demand[c]?.[m.courseCategory] ?? 0));

    const scored = candidates.map((code) => {
      const camp = campsByState.get(code)!;
      const dest = STATE_BY_CODE[code];
      const criteria: Weights = {
        security: RISK_SCORE[riskByState.get(code) ?? "Moderate"],
        course: maxDemand > 0 ? (demand[code]?.[m.courseCategory] ?? 0) / maxDemand : 0.5,
        preference: preferenceScore(m.preferences, code),
        integration: origin && dest ? integrationScore(origin.zone, dest.zone) : 1,
        capacity: camp.capacity > 0 ? camp.remaining / camp.capacity : 0,
      };
      return { code, criteria };
    });

    // TOPSIS needs a small epsilon so all-zero columns don't collapse norms.
    const matrix = scored.map((s) => CRITERIA.map((c) => s.criteria[c] + 1e-6));
    const { closeness, ranking } = topsis(matrix, w);
    const bestIdx = ranking[0];
    const best = scored[bestIdx];
    const camp = campsByState.get(best.code)!;

    camp.remaining -= 1;
    const cat = m.courseCategory;
    if (demand[best.code]?.[cat]) demand[best.code]![cat]! -= 1;

    counters[m.institutionCode] = (counters[m.institutionCode] ?? 0) + 1;
    const callUpNo = formatCallUpNo(m.institutionCode, input.batchCode, counters[m.institutionCode]);
    const prefIdx = m.preferences.indexOf(best.code);

    decisions.push({
      uid: m.uid,
      stateCode: best.code,
      campId: camp.id,
      campName: camp.name,
      callUpNo,
      closeness: round(closeness[bestIdx]),
      rank: qi + 1,
      preferenceRank: prefIdx >= 0 ? prefIdx + 1 : null,
      candidates: ranking.map((i) => ({
        stateCode: scored[i].code,
        criteria: roundWeights(scored[i].criteria),
        closeness: round(closeness[i]),
      })),
      excluded,
    });
  });

  const campOccupancy: Record<string, number> = {};
  for (const c of campsByState.values()) campOccupancy[c.id] = c.capacity - c.remaining;

  return {
    seed,
    weights,
    decisions,
    unallocated,
    campOccupancy,
    counters,
    stats: computeStats(input, decisions, unallocated.length, campsByState),
  };
}

function computeStats(
  input: AllocationInput,
  decisions: AllocationDecision[],
  unallocatedCount: number,
  camps: Map<string, AllocCampInput & { remaining: number }>,
): AllocationStats {
  const byUid = new Map(input.members.map((m) => [m.uid, m]));
  const risk = new Map(input.states.map((s) => [s.code, s.riskLevel]));
  const perState: Record<string, number> = {};
  let first = 0,
    anyPref = 0,
    outZone = 0,
    crossRegion = 0,
    sumC = 0,
    originViolations = 0,
    criticalWithoutConsent = 0;

  for (const d of decisions) {
    const m = byUid.get(d.uid)!;
    perState[d.stateCode] = (perState[d.stateCode] ?? 0) + 1;
    if (d.preferenceRank === 1) first++;
    if (d.preferenceRank) anyPref++;
    const oz = STATE_BY_CODE[m.stateOfOrigin]?.zone;
    const dz = STATE_BY_CODE[d.stateCode]?.zone;
    if (oz && dz && oz !== dz) outZone++;
    if (oz && dz && ZONE_REGION[oz] !== ZONE_REGION[dz]) crossRegion++;
    if (d.stateCode === m.stateOfOrigin) originViolations++;
    if (risk.get(d.stateCode) === "Critical" && !m.riskConsent) criticalWithoutConsent++;
    sumC += d.closeness;
  }
  const n = decisions.length || 1;
  const campOverflows = [...camps.values()].filter((c) => c.remaining < 0).length;
  return {
    total: input.members.length,
    allocated: decisions.length,
    unallocated: unallocatedCount,
    firstChoicePct: pct(first, n),
    anyPreferencePct: pct(anyPref, n),
    integrationIndexPct: pct(outZone, n),
    crossRegionPct: pct(crossRegion, n),
    avgCloseness: round(sumC / n),
    perState,
    originViolations,
    criticalWithoutConsent,
    campOverflows,
  };
}

const round = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d;
const pct = (a: number, b: number) => Math.round((a / b) * 1000) / 10;
const roundWeights = (w: Weights): Weights =>
  Object.fromEntries(Object.entries(w).map(([k, v]) => [k, round(v)])) as Weights;
