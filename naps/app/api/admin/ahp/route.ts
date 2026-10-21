import { NextResponse } from "next/server";
import { computeAhp, defaultAhpMatrix, makeReciprocal } from "@/lib/algorithms/ahp";
import { handleApiError } from "@/lib/apiHandler";
import { db, nowIso } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";
import { CRITERIA, type AllocationConfig, type Weights } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireApiRole(["admin"]);
    const body = (await req.json()) as {
      matrix?: number[][];
      resetDefault?: boolean;
    };

    const rawMatrix = body.resetDefault ? defaultAhpMatrix() : body.matrix;
    if (!rawMatrix || rawMatrix.length !== 5) {
      return NextResponse.json({ error: "Expected a 5x5 AHP pairwise comparison matrix." }, { status: 400 });
    }

    const matrix = makeReciprocal(rawMatrix);
    const result = computeAhp(matrix);

    if (!result.consistent) {
      return NextResponse.json(
        {
          error: `Inconsistent pairwise judgements: Consistency Ratio CR = ${result.consistencyRatio.toFixed(4)} exceeds Saaty threshold (0.10). Please revise comparisons.`,
          ahp: result,
        },
        { status: 400 },
      );
    }

    const weights = Object.fromEntries(
      CRITERIA.map((c, idx) => [c, Math.round(result.weights[idx]! * 10000) / 10000]),
    ) as Weights;

    const configDoc: AllocationConfig = {
      weights,
      ahpMatrix: matrix,
      consistencyRatio: Math.round(result.consistencyRatio * 10000) / 10000,
      updatedBy: user.uid,
      updatedAt: nowIso(),
    };

    await db().collection("config").doc("allocation").set(configDoc as unknown as Record<string, unknown>);

    await writeAudit({
      action: "AHP_WEIGHTS_UPDATED",
      actorUid: user.uid,
      actorRole: user.role,
      actorName: user.name,
      targetType: "config",
      targetId: "allocation",
      details: {
        weights,
        consistencyRatio: configDoc.consistencyRatio,
        lambdaMax: Math.round(result.lambdaMax * 10000) / 10000,
      },
    });

    return NextResponse.json({ config: configDoc, ahp: result });
  } catch (err) {
    return handleApiError(err);
  }
}
