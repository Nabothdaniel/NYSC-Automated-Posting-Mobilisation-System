import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { db, nowIso } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";
import { notifyUser } from "@/lib/services/notify";
import type { CorpsMember } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireApiRole(["corps_member"]);
    const body = (await req.json()) as {
      decision: "accept" | "alternative";
      reason?: string;
    };

    const ref = db().collection("corpsMembers").doc(user.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Corps member not found" }, { status: 404 });
    }
    const member = snap.data() as CorpsMember;
    if (!member.ppa) {
      return NextResponse.json({ error: "No PPA assignment found yet." }, { status: 400 });
    }

    if (body.decision === "accept") {
      const updatedPpa = {
        ...member.ppa,
        acceptedAt: nowIso(),
      };
      await ref.update({
        status: "PPA_ACCEPTED",
        ppa: updatedPpa,
      });

      await writeAudit({
        action: "PPA_ACCEPTED_BY_MEMBER",
        actorUid: user.uid,
        actorRole: "corps_member",
        actorName: user.name,
        targetType: "corpsMember",
        targetId: user.uid,
        details: {
          vacancyId: member.ppa.vacancyId,
          employerName: member.ppa.employerName,
        },
      });

      await notifyUser({
        uid: user.uid,
        email: member.email,
        title: "PPA Posting Accepted",
        body: `You have accepted your posting to ${member.ppa.employerName} (${member.ppa.title}). Awaiting employer confirmation.`,
        type: "success",
        link: "/member/ppa",
      });

      await notifyUser({
        uid: "usr_emp_01",
        title: `Corps Member Accepted PPA: ${member.surname} ${member.firstName}`,
        body: `${member.surname} ${member.firstName} accepted placement as ${member.ppa.title}. Click to confirm Assumption of Duty.`,
        type: "action",
        link: "/employer/placements",
      });

      return NextResponse.json({ status: "PPA_ACCEPTED", ppa: updatedPpa });
    }

    // Request alternative (allowed max 1 time)
    if (member.ppa.altUsed) {
      return NextResponse.json(
        { error: "You have already used your one-time alternative PPA request." },
        { status: 400 },
      );
    }
    const reason = (body.reason || "").trim();
    if (reason.length < 10) {
      return NextResponse.json(
        { error: "Please provide a clear justification (at least 10 characters) for requesting an alternative PPA." },
        { status: 400 },
      );
    }

    // Decrement old vacancy filled count
    const vacRef = db().collection("vacancies").doc(member.ppa.vacancyId);
    const vacSnap = await vacRef.get();
    if (vacSnap.exists) {
      const filled = Math.max(0, Number(vacSnap.data()?.filled ?? 1) - 1);
      await vacRef.update({ filled });
    }

    const excluded = Array.from(new Set([...(member.ppa.excludedVacancyIds ?? []), member.ppa.vacancyId]));
    const updatedPpa = {
      ...member.ppa,
      altRequest: { reason, requestedAt: nowIso() },
      altUsed: true,
      excludedVacancyIds: excluded,
    };

    await ref.update({
      status: "PPA_ALTERNATIVE_REQUESTED",
      ppa: updatedPpa,
    });

    await writeAudit({
      action: "PPA_ALTERNATIVE_REQUESTED",
      actorUid: user.uid,
      actorRole: "corps_member",
      actorName: user.name,
      targetType: "corpsMember",
      targetId: user.uid,
      details: { previousVacancyId: member.ppa.vacancyId, reason },
    });

    await notifyUser({
      uid: "usr_admin_01",
      title: `Alternative PPA Requested: ${member.surname} ${member.firstName}`,
      body: `${member.surname} ${member.firstName} requested an alternative PPA (${reason}). Re-run PPA Matching to assign next available employer.`,
      type: "action",
      link: "/admin/ppa-matching",
    });

    return NextResponse.json({ status: "PPA_ALTERNATIVE_REQUESTED", ppa: updatedPpa });
  } catch (err) {
    return handleApiError(err);
  }
}
