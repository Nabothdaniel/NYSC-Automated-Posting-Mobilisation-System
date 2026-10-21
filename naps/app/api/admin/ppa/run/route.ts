import { NextResponse } from "next/server";
import { runPpaMatching } from "@/lib/algorithms/ppaMatching";
import { handleApiError } from "@/lib/apiHandler";
import { db, docsOf, nowIso } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import { DEFAULT_BATCH_ID } from "@/lib/seedData";
import { writeAudit } from "@/lib/services/audit";
import { notifyUser } from "@/lib/services/notify";
import type { CorpsMember, StateDoc, Vacancy } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireApiRole(["admin"]);
    const body = (await req.json().catch(() => ({}))) as { batchId?: string };
    const batchId = body.batchId || DEFAULT_BATCH_ID;

    const [membersSnap, vacSnap, statesSnap] = await Promise.all([
      db().collection("corpsMembers").where("batchId", "==", batchId).get(),
      db().collection("vacancies").where("active", "==", true).get(),
      db().collection("states").get(),
    ]);

    const allMembers = docsOf<CorpsMember>(membersSnap);
    const eligible = allMembers.filter(
      (m) =>
        (m.status === "ALLOCATED" || m.status === "PPA_ALTERNATIVE_REQUESTED") &&
        Boolean(m.allocation?.stateCode),
    );
    const vacancies = docsOf<Vacancy>(vacSnap);
    const riskByState = new Map(docsOf<StateDoc>(statesSnap).map((s) => [s.code, s.riskLevel]));

    const result = runPpaMatching(
      eligible.map((m) => ({
        uid: m.uid,
        stateCode: m.allocation!.stateCode,
        courseCategory: m.courseCategory,
        qualification: m.qualification,
        excludedVacancyIds: m.ppa?.excludedVacancyIds,
      })),
      vacancies,
      (stateCode) => riskByState.get(stateCode) ?? "Moderate",
    );

    const vacById = new Map(vacancies.map((v) => [v.id, v]));
    const memberByUid = new Map(eligible.map((m) => [m.uid, m]));
    const now = nowIso();

    for (const match of result.matches) {
      const vac = vacById.get(match.vacancyId)!;
      const m = memberByUid.get(match.uid)!;
      await db()
        .collection("corpsMembers")
        .doc(match.uid)
        .update({
          status: "PPA_MATCHED",
          ppa: {
            vacancyId: vac.id,
            employerId: vac.employerId,
            employerName: vac.employerName,
            title: vac.title,
            lga: vac.lga,
            score: match.score,
            matchedAt: now,
            altUsed: m.ppa?.altUsed ?? false,
            excludedVacancyIds: m.ppa?.excludedVacancyIds ?? [],
          },
        });

      await writeAudit({
        action: "PPA_MATCHED_TO_MEMBER",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "corpsMember",
        targetId: match.uid,
        details: {
          vacancyId: vac.id,
          employerName: vac.employerName,
          title: vac.title,
          lga: vac.lga,
          score: match.score,
          breakdown: match.breakdown,
        },
      });

      await notifyUser({
        uid: match.uid,
        email: m.email,
        phone: m.phone,
        title: `PPA Matched: ${vac.employerName}`,
        body: `You have been matched to ${vac.employerName} (${vac.title}, ${vac.lga} LGA) with a skills match score of ${match.score}. Review and accept on your PPA page.`,
        type: "action",
        link: "/member/ppa",
      });
    }

    for (const [vacId, filled] of Object.entries(result.filled)) {
      await db().collection("vacancies").doc(vacId).update({ filled });
    }

    await db().collection("batches").doc(batchId).update({ status: "ppa" });

    await writeAudit({
      action: "BATCH_PPA_MATCHING_COMPLETED",
      actorUid: user.uid,
      actorRole: user.role,
      actorName: user.name,
      targetType: "batch",
      targetId: batchId,
      details: result.stats,
    });

    return NextResponse.json({
      stats: result.stats,
      matchedCount: result.matches.length,
      unmatched: result.unmatched,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
