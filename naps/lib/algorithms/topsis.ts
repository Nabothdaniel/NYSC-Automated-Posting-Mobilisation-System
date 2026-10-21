/**
 * TOPSIS — Technique for Order Preference by Similarity to Ideal Solution.
 * All criteria are treated as benefit criteria (higher = better); callers must
 * convert cost criteria (e.g. risk) into benefit scores beforehand.
 */
export interface TopsisResult {
  /** Closeness coefficient Ci in [0,1] per alternative (same order as input). */
  closeness: number[];
  /** Indices of alternatives sorted best → worst. */
  ranking: number[];
}

export function topsis(matrix: number[][], weights: number[]): TopsisResult {
  const m = matrix.length;
  if (m === 0) return { closeness: [], ranking: [] };
  const n = weights.length;

  // 1. Vector normalisation per criterion column
  const norms = Array.from({ length: n }, (_, j) =>
    Math.sqrt(matrix.reduce((s, row) => s + row[j] * row[j], 0)),
  );

  // 2. Weighted normalised matrix
  const v = matrix.map((row) => row.map((x, j) => (norms[j] === 0 ? 0 : (x / norms[j]) * weights[j])));

  // 3. Ideal (best) and anti-ideal (worst) solutions
  const ideal = Array.from({ length: n }, (_, j) => Math.max(...v.map((r) => r[j])));
  const anti = Array.from({ length: n }, (_, j) => Math.min(...v.map((r) => r[j])));

  // 4. Separation measures + closeness coefficient
  const closeness = v.map((row) => {
    const dPlus = Math.sqrt(row.reduce((s, x, j) => s + (x - ideal[j]) ** 2, 0));
    const dMinus = Math.sqrt(row.reduce((s, x, j) => s + (x - anti[j]) ** 2, 0));
    const denom = dPlus + dMinus;
    return denom === 0 ? 1 : dMinus / denom;
  });

  const ranking = closeness
    .map((c, i) => [c, i] as const)
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .map(([, i]) => i);

  return { closeness, ranking };
}
