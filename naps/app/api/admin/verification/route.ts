import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { db, docsOf, nowIso } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";
import { notifyUser } from "@/lib/services/notify";
import {
  FLAG_LABEL,
  type Batch,
  type CorpsMember,
  type NimcRecord,
  type SenateRecord,
} from "@/lib/types";
import { runVerificationChecks } from "@/lib/verification/checks";

export async function POST(req: Request) {
  try {
    const user = await requireApiRole(["admin"]);
    const body = (await req.json()) as {
      uid: string;
      decision: "approve" | "reject" | "recheck";
      note?: string;
    };

    if (!body.uid || !body.decision) {
      return NextResponse.json({ error: "Missing student uid or decision." }, { status: 400 });
    }

    const ref = db().collection("corpsMembers").doc(body.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Corps member not found" }, { status: 404 });
    }
    const member = snap.data() as CorpsMember;

    // Option 1: Re-run automated NIMC + Senate List checks
    if (body.decision === "recheck") {
      const nimcSnap = await db().collection("nimcRecords").doc(member.nin).get();
      const nimc = nimcSnap.exists ? (nimcSnap.data() as NimcRecord) : null;

      const senateSnap = await db()
        .collection("senateLists")
        .where("matricNo", "==", member.matricNo)
        .get();
      const senateDocs = docsOf<SenateRecord>(senateSnap);
      const senate =
        senateDocs.find((s) => s.institutionId === member.institutionId) ?? senateDocs[0] ?? null;

      const allMembersSnap = await db().collection("corpsMembers").get();
      const allMembers = docsOf<CorpsMember>(allMembersSnap);
      const duplicateNinOrMatric = allMembers.some(
        (m) =>
          m.uid !== member.uid &&
          (m.nin === member.nin || m.matricNo.toUpperCase() === member.matricNo.toUpperCase()),
      );

      const batchSnap = await db().collection("batches").doc(member.batchId).get();
      const batch = batchSnap.data() as Batch | undefined;
      const mobilizationDate = batch?.mobilizationDate ?? "2026-05-15";
      const maxAge = batch?.maxAge ?? 30;

      const checkResult = runVerificationChecks({
        member,
        nimc,
        senate,
        duplicateNinOrMatric,
        mobilizationDate,
        maxAge,
      });

      await ref.update({
        status: checkResult.status,
        flags: checkResult.flags,
        verifiedAt: checkResult.passed ? nowIso() : undefined,
      });

      if (checkResult.passed && senate) {
        await db().collection("senateLists").doc(senate.id).update({ used: true });
      }

      await writeAudit({
        action: checkResult.passed ? "ADMIN_AUTOCHECK_PASSED" : "ADMIN_AUTOCHECK_FLAGGED",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "corpsMember",
        targetId: body.uid,
        details: {
          status: checkResult.status,
          flags: checkResult.flags,
        },
      });

      return NextResponse.json({
        uid: body.uid,
        status: checkResult.status,
        flags: checkResult.flags,
        passed: checkResult.passed,
      });
    }

    // Option 2: Manual Admin Approve or Reject
    const note = (body.note || "").trim();
    if (note.length < 5) {
      return NextResponse.json(
        {
          error:
            "An approval/rejection note (at least 5 characters) is required for the audit log.",
        },
        { status: 400 },
      );
    }

    const newStatus = body.decision === "approve" ? "VERIFIED" : "REJECTED";

    await ref.update({
      status: newStatus,
      reviewNote: note,
      verifiedAt: body.decision === "approve" ? nowIso() : undefined,
    });

    await writeAudit({
      action: body.decision === "approve" ? "FLAGGED_MEMBER_APPROVED" : "FLAGGED_MEMBER_REJECTED",
      actorUid: user.uid,
      actorRole: user.role,
      actorName: user.name,
      targetType: "corpsMember",
      targetId: body.uid,
      details: {
        previousStatus: member.status,
        previousFlags: member.flags,
        note,
        newStatus,
      },
    });

    await notifyUser({
      uid: body.uid,
      email: member.email,
      phone: member.phone,
      title:
        body.decision === "approve"
          ? "Application Approved — Status: VERIFIED"
          : "Mobilisation Verification Declined",
      body:
        body.decision === "approve"
          ? `Your registration has been reviewed and approved by NYSC HQ (${note}). You are now queued for state posting.`
          : `Your verification was declined (${note}). Please check your profile or contact your institution mobilization officer.`,
      type: body.decision === "approve" ? "success" : "warning",
      link: "/member/dashboard",
    });

    return NextResponse.json({ uid: body.uid, status: newStatus });
  } catch (err) {
    return handleApiError(err);
  }
}
