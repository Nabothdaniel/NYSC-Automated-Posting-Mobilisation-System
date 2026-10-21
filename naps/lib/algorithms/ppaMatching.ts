/**
 * Skills-based PPA (Place of Primary Assignment) matching.
 *
 * score = 0.5·disciplineMatch + 0.2·safety + 0.2·qualificationFit + 0.1·capacityRatio
 *
 * Greedy global assignment per state: every (member, vacancy) pair is scored,
 * pairs are sorted by score, and assigned while both the member is unassigned and
 * the vacancy has remaining slots. Vacancies that do not accept the member's
 * discipline are only used as a fallback if they are "general" (no categories).
 */
import { RISK_SCORE } from "../constants/risk";
import type { RiskLevel } from "../constants/states";
import type { CourseCategory } from "../constants/courses";

export const PPA_WEIGHTS = { discipline: 0.5, safety: 0.2, qualification: 0.2, capacity: 0.1 };

export interface PpaMemberInput {
  uid: string;
  stateCode: string;
  courseCategory: CourseCategory;
  qualification: string;
  excludedVacancyIds?: string[];
}

export interface PpaVacancyInput {
  id: string;
  employerId: string;
  employerName: string;
  title: string;
  stateCode: string;
  lga: string;
  courseCategories: CourseCategory[];
  preferredQualifications: string[];
  capacity: number;
  filled: number;
}

export interface PpaBreakdown {
  discipline: number;
  safety: number;
  qualification: number;
  capacity: number;
}

export interface PpaMatch {
  uid: string;
  vacancyId: string;
  score: number;
  breakdown: PpaBreakdown;
}

export interface PpaResult {
  matches: PpaMatch[];
  unmatched: { uid: string; reason: string }[];
  filled: Record<string, number>; // vacancyId → filled after run
  stats: { total: number; matched: number; disciplineMatchPct: number; avgScore: number };
}

export function scorePair(
  m: PpaMemberInput,
  v: PpaVacancyInput,
  remaining: number,
  risk: RiskLevel,
): { score: number; breakdown: PpaBreakdown } | null {
  if (remaining <= 0) return null;
  if (m.excludedVacancyIds?.includes(v.id)) return null;
  const general = v.courseCategories.length === 0;
  const matches = v.courseCategories.includes(m.courseCategory);
  if (!matches && !general) return null;

  const breakdown: PpaBreakdown = {
    discipline: matches ? 1 : 0.3,
    safety: RISK_SCORE[risk],
    qualification:
      v.preferredQualifications.length === 0
        ? 0.5
        : v.preferredQualifications.some((q) => q.toLowerCase() === m.qualification.toLowerCase())
          ? 1
          : 0.2,
    capacity: v.capacity > 0 ? remaining / v.capacity : 0,
  };
  const score =
    PPA_WEIGHTS.discipline * breakdown.discipline +
    PPA_WEIGHTS.safety * breakdown.safety +
    PPA_WEIGHTS.qualification * breakdown.qualification +
    PPA_WEIGHTS.capacity * breakdown.capacity;
  return { score: Math.round(score * 10000) / 10000, breakdown };
}

export function runPpaMatching(
  members: PpaMemberInput[],
  vacancies: PpaVacancyInput[],
  riskByLga: (stateCode: string, lga: string) => RiskLevel,
): PpaResult {
  const filled: Record<string, number> = Object.fromEntries(vacancies.map((v) => [v.id, v.filled]));
  const byState = new Map<string, { members: PpaMemberInput[]; vacancies: PpaVacancyInput[] }>();
  for (const m of members) {
    if (!byState.has(m.stateCode)) byState.set(m.stateCode, { members: [], vacancies: [] });
    byState.get(m.stateCode)!.members.push(m);
  }
  for (const v of vacancies) byState.get(v.stateCode)?.vacancies.push(v);

  const matches: PpaMatch[] = [];
  const assigned = new Set<string>();

  for (const { members: ms, vacancies: vs } of byState.values()) {
    const pairs: { m: PpaMemberInput; v: PpaVacancyInput; score: number; breakdown: PpaBreakdown }[] = [];
    for (const m of ms) {
      for (const v of vs) {
        const s = scorePair(m, v, v.capacity - filled[v.id], riskByLga(v.stateCode, v.lga));
        if (s) pairs.push({ m, v, ...s });
      }
    }
    pairs.sort((a, b) => b.score - a.score || a.m.uid.localeCompare(b.m.uid) || a.v.id.localeCompare(b.v.id));
    for (const p of pairs) {
      if (assigned.has(p.m.uid)) continue;
      if (filled[p.v.id] >= p.v.capacity) continue;
      filled[p.v.id] += 1;
      assigned.add(p.m.uid);
      matches.push({ uid: p.m.uid, vacancyId: p.v.id, score: p.score, breakdown: p.breakdown });
    }
  }

  const unmatched = members
    .filter((m) => !assigned.has(m.uid))
    .map((m) => ({ uid: m.uid, reason: "No suitable vacancy with remaining capacity in posted state" }));

  const disc = matches.filter((x) => x.breakdown.discipline === 1).length;
  return {
    matches,
    unmatched,
    filled,
    stats: {
      total: members.length,
      matched: matches.length,
      disciplineMatchPct: matches.length ? Math.round((disc / matches.length) * 1000) / 10 : 0,
      avgScore: matches.length
        ? Math.round((matches.reduce((s, x) => s + x.score, 0) / matches.length) * 10000) / 10000
        : 0,
    },
  };
}
