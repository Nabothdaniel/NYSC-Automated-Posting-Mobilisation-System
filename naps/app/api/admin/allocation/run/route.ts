import { NextResponse } from "next/server";
import { runAllocation } from "@/lib/algorithms/allocation";
import { newSeed } from "@/lib/algorithms/seededRandom";
import { handleApiError } from "@/lib/apiHandler";
import type { CourseCategory } from "@/lib/constants/courses";
import { STATE_BY_CODE, stateName } from "@/lib/constants/states";
import { db, docsOf, nowIso } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import { DEFAULT_BATCH_ID, SEED_INSTITUTIONS } from "@/lib/seedData";
import { writeAudit } from "@/lib/services/audit";
import { notifyUser } from "@/lib/services/notify";
import {
  DEFAULT_WEIGHTS,
  type AllocationConfig,
  type Batch,
  type Camp,
  type CorpsMember,
  type Institution,
  type StateDoc,
  type Vacancy,
} from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireApiRole(["admin"]);
    const body = (await req.json()) as {
      batchId?: string;
      dryRun?: boolean;
      seed?: number;
    };

    const batchId = body.batchId || DEFAULT_BATCH_ID;
    const dryRun = Boolean(body.dryRun);
    const seed = typeof body.seed === "number" && body.seed > 0 ? body.seed : newSeed();

    const [batchSnap, configSnap, statesSnap, campsSnap, membersSnap, instSnap, vacSnap] =
      await Promise.all([
        db().collection("batches").doc(batchId).get(),
        db().collection("config").doc("allocation").get(),
        db().collection("states").get(),
        db().collection("camps").get(),
        db().collection("corpsMembers").where("batchId", "==", batchId).get(),
        db().collection("institutions").get(),
        db().collection("vacancies").where("active", "==", true).get(),
      ]);

    const batch = (batchSnap.data() as Batch | undefined) ?? {
      id: batchId,
      name: "2026 Batch A Stream I",
      year: 2026,
      batch: "A",
      stream: "I",
      mobilizationDate: "2026-05-15",
      maxAge: 30,
      status: "open",
      createdAt: nowIso(),
    };

    const config = (configSnap.data() as AllocationConfig | undefined)?.weights ?? DEFAULT_WEIGHTS;
    const states = docsOf<StateDoc>(statesSnap);
    const camps = docsOf<Camp>(campsSnap);
    const allBatchMembers = docsOf<CorpsMember>(membersSnap);
    const verifiedMembers = allBatchMembers.filter((m) => m.status === "VERIFIED");

    const instList = docsOf<Institution>(instSnap);
    const instCodeById = new Map<string, string>(
      [...SEED_INSTITUTIONS, ...instList].map((i) => [i.id, i.code]),
    );

    // Aggregate open PPA demand per state and courseCategory
    const demand: Record<string, Partial<Record<CourseCategory, number>>> = {};
    for (const v of docsOf<Vacancy>(vacSnap)) {
      const rem = Math.max(0, v.capacity - v.filled);
      if (rem <= 0) continue;
      if (!demand[v.stateCode]) demand[v.stateCode] = {};
      for (const cat of v.courseCategories) {
        demand[v.stateCode]![cat] = (demand[v.stateCode]![cat] ?? 0) + rem;
      }
    }

    const batchCode = `${String(batch.year).slice(-2)}${batch.batch}${batch.stream}`;
    const result = runAllocation({
      members: verifiedMembers.map((m) => ({
        uid: m.uid,
        stateOfOrigin: m.stateOfOrigin,
        courseCategory: m.courseCategory,
        preferences: m.preferences ?? [],
        riskConsent: Boolean(m.riskConsent),
        institutionCode: instCodeById.get(m.institutionId) ?? "NYSC",
      })),
      states: states.map((s) => ({ code: s.code, riskLevel: s.riskLevel })),
      camps: camps.map((c) => ({
        id: c.id,
        stateCode: c.stateCode,
        name: c.name,
        capacity: c.capacity,
        occupied: c.occupied,
      })),
      demand,
      weights: config,
      seed,
      batchCode,
    });

    const memberByUid = new Map(verifiedMembers.map((m) => [m.uid, m]));
    const enrichedDecisions = result.decisions.map((d) => {
      const m = memberByUid.get(d.uid);
      return {
        ...d,
        fullName: m ? `${m.surname} ${m.firstName}` : d.uid,
        matricNo: m?.matricNo ?? "",
        course: m?.course ?? "",
        courseCategory: m?.courseCategory ?? "ICT",
        stateOfOrigin: m?.stateOfOrigin ?? "",
        originZone: m ? STATE_BY_CODE[m.stateOfOrigin]?.zone : "",
        postedZone: STATE_BY_CODE[d.stateCode]?.zone ?? "",
        postedStateName: stateName(d.stateCode),
      };
    });

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        seed: result.seed,
        weights: result.weights,
        stats: result.stats,
        decisions: enrichedDecisions,
        unallocated: result.unallocated,
      });
    }

    // Commit allocation results
    const runId = `run_${Date.now().toString(36)}`;
    const now = nowIso();

    for (const d of result.decisions) {
      const m = memberByUid.get(d.uid)!;
      await db()
        .collection("corpsMembers")
        .doc(d.uid)
        .update({
          status: "ALLOCATED",
          allocation: {
            stateCode: d.stateCode,
            campId: d.campId,
            campName: d.campName,
            callUpNo: d.callUpNo,
            score: d.closeness,
            rank: d.rank,
            runId,
            allocatedAt: now,
          },
        });

      // Write deterministic audit decision explanation so member and auditor can inspect TOPSIS breakdown
      await writeAudit({
        id: `explain_${d.uid}`,
        action: "MEMBER_STATE_ALLOCATED",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "corpsMember",
        targetId: d.uid,
        runId,
        details: {
          callUpNo: d.callUpNo,
          chosenState: d.stateCode,
          campName: d.campName,
          closeness: d.closeness,
          preferenceRank: d.preferenceRank,
          weights: result.weights,
          seed: result.seed,
          topCandidates: d.candidates.slice(0, 8),
          excluded: d.excluded,
        },
      });

      await notifyUser({
        uid: d.uid,
        email: m.email,
        phone: m.phone,
        title: `State Posting Ready: ${stateName(d.stateCode)} (${d.callUpNo})`,
        body: `You have been allocated to ${stateName(d.stateCode)} (${d.campName}) with Call-Up No. ${d.callUpNo}. Download your Call-Up Letter or view the TOPSIS score breakdown.`,
        type: "success",
        link: "/member/allocation",
      });
    }

    // Update camp occupancy
    for (const [campId, occupied] of Object.entries(result.campOccupancy)) {
      await db().collection("camps").doc(campId).update({ occupied });
    }

    // Update batch status & record allocation run
    await db().collection("batches").doc(batchId).update({ status: "allocated" });
    await db().collection("allocationRuns").doc(runId).set({
      id: runId,
      batchId,
      seed: result.seed,
      weights: result.weights,
      startedBy: user.uid,
      startedAt: now,
      finishedAt: nowIso(),
      stats: result.stats,
    });

    await writeAudit({
      action: "BATCH_ALLOCATION_COMMITTED",
      actorUid: user.uid,
      actorRole: user.role,
      actorName: user.name,
      targetType: "batch",
      targetId: batchId,
      runId,
      details: {
        seed: result.seed,
        weights: result.weights,
        stats: result.stats,
      },
    });

    return NextResponse.json({
      dryRun: false,
      runId,
      seed: result.seed,
      weights: result.weights,
      stats: result.stats,
      decisions: enrichedDecisions,
      unallocated: result.unallocated,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
