/**
 * Analytic Hierarchy Process (Saaty, 2000).
 * Computes criterion weights from a pairwise comparison matrix using the
 * principal eigenvector (power iteration) and reports the Consistency Ratio.
 */

/** Saaty's Random Index for n = 1..10 */
export const RANDOM_INDEX = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

export interface AhpResult {
  weights: number[];
  lambdaMax: number;
  consistencyIndex: number;
  consistencyRatio: number;
  consistent: boolean;
}

/** Ensures the matrix is reciprocal: a[j][i] = 1 / a[i][j], diagonal = 1. */
export function makeReciprocal(upper: number[][]): number[][] {
  const n = upper.length;
  const m = Array.from({ length: n }, () => Array(n).fill(1));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = upper[i][j];
      if (!(v > 0)) throw new Error(`Invalid comparison value at (${i},${j})`);
      m[i][j] = v;
      m[j][i] = 1 / v;
    }
  }
  return m;
}

export function computeAhp(matrix: number[][], iterations = 100): AhpResult {
  const n = matrix.length;
  if (n === 0 || matrix.some((r) => r.length !== n)) throw new Error("Matrix must be square");

  let w = Array(n).fill(1 / n);
  for (let k = 0; k < iterations; k++) {
    const next = matrix.map((row) => row.reduce((s, a, j) => s + a * w[j], 0));
    const sum = next.reduce((a, b) => a + b, 0);
    const normalised = next.map((x) => x / sum);
    const delta = normalised.reduce((s, x, i) => s + Math.abs(x - w[i]), 0);
    w = normalised;
    if (delta < 1e-12) break;
  }

  const aw = matrix.map((row) => row.reduce((s, a, j) => s + a * w[j], 0));
  const lambdaMax = aw.reduce((s, x, i) => s + x / w[i], 0) / n;
  const ci = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
  const ri = RANDOM_INDEX[n - 1] ?? 1.49;
  const cr = ri === 0 ? 0 : ci / ri;

  return {
    weights: w,
    lambdaMax,
    consistencyIndex: ci,
    consistencyRatio: Math.max(0, cr),
    consistent: cr < 0.1,
  };
}

/**
 * Default matrix for [security, course, preference, integration, capacity].
 * Built from the ratio of the target weights 30/25/20/15/10, so it is perfectly
 * consistent (CR = 0) and reproduces those weights exactly.
 */
export function defaultAhpMatrix(): number[][] {
  const target = [0.3, 0.25, 0.2, 0.15, 0.1];
  return target.map((wi) => target.map((wj) => +(wi / wj).toFixed(4)));
}

export const SAATY_SCALE: { value: number; label: string }[] = [
  { value: 1 / 9, label: "1/9" },
  { value: 1 / 7, label: "1/7" },
  { value: 1 / 5, label: "1/5" },
  { value: 1 / 3, label: "1/3" },
  { value: 1 / 2, label: "1/2" },
  { value: 1, label: "1 — Equal" },
  { value: 1.2, label: "1.2" },
  { value: 1.25, label: "1.25" },
  { value: 1.333, label: "1.33" },
  { value: 1.5, label: "1.5" },
  { value: 2, label: "2" },
  { value: 3, label: "3 — Moderate" },
  { value: 5, label: "5 — Strong" },
  { value: 7, label: "7 — Very strong" },
  { value: 9, label: "9 — Extreme" },
];
