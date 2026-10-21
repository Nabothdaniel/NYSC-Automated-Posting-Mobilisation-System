import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { categoryOf } from "@/lib/constants/courses";
import { db, docsOf, nowIso } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import { SEED_INSTITUTIONS } from "@/lib/seedData";
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
    const user = await requireApiRole(["corps_member"]);
    const body = (await req.json()) as Partial<CorpsMember> & { submit?: boolean };

    const memberRef = db().collection("corpsMembers").doc(user.uid);
    const snap = await memberRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Corps member record not found" }, { status: 404 });
    }
    const current = snap.data() as CorpsMember;

    // Prevent profile tampering after allocation has already run
    if (["ALLOCATED", "PPA_MATCHED", "PPA_ACCEPTED", "DEPLOYED"].includes(current.status)) {
      return NextResponse.json(
        { error: "Profile and preferences are locked after allocation." },
        { status: 400 },
      );
    }

    // Validate state of origin is not in preferences
    const soo = body.stateOfOrigin ?? current.stateOfOrigin;
    const prefs = (body.preferences ?? current.preferences ?? []).filter((code) => code && code !== soo).slice(0, 4);

    const instId = body.institutionId ?? current.institutionId;
    const instSnap = await db().collection("institutions").doc(instId).get();
    const instName =
      (instSnap.data()?.name as string | undefined) ??
      SEED_INSTITUTIONS.find((i) => i.id === instId)?.name ??
      current.institutionName;
    const isForeign =
      body.isForeignTrained ??
      ((instSnap.data()?.type as string | undefined) === "foreign" || instId === "inst_uk_leeds");
    const course = body.course ?? current.course;

    const updated: CorpsMember = {
      ...current,
      surname: (body.surname ?? current.surname).trim(),
      firstName: (body.firstName ?? current.firstName).trim(),
      otherNames: body.otherNames !== undefined ? body.otherNames.trim() : current.otherNames,
      gender: body.gender ?? current.gender,
      dob: body.dob ?? current.dob,
      nin: (body.nin ?? current.nin).trim(),
      matricNo: (body.matricNo ?? current.matricNo).trim().toUpperCase(),
      institutionId: instId,
      institutionName: instName,
      stateOfOrigin: soo,
      phone: (body.phone ?? current.phone).trim(),
      course,
      courseCategory: categoryOf(course),
      qualification: body.qualification ?? current.qualification,
      classOfDegree: body.classOfDegree ?? current.classOfDegree,
      graduationYear: Number(body.graduationYear ?? current.graduationYear) || 2025,
      isForeignTrained: isForeign,
      preferences: prefs,
      riskConsent: Boolean(body.riskConsent ?? current.riskConsent),
      riskConsentAt:
        body.riskConsent && !current.riskConsent ? nowIso() : current.riskConsentAt,
      hasPhoto: body.hasPhoto ?? current.hasPhoto ?? true,
      hasCertificate: body.hasCertificate ?? current.hasCertificate ?? true,
    };

    if (body.submit) {
      if (!updated.hasPhoto || !updated.hasCertificate) {
        return NextResponse.json(
          { error: "Passport photograph and degree/HND certificate must be uploaded before verification." },
          { status: 400 },
        );
      }
      if (updated.preferences.length === 0) {
        return NextResponse.json(
          { error: "Please select at least 1 preferred state before submitting for verification." },
          { status: 400 },
        );
      }

      // Fetch NIMC record
      const nimcSnap = await db().collection("nimcRecords").doc(updated.nin).get();
      const nimc = nimcSnap.exists ? (nimcSnap.data() as NimcRecord) : null;

      // Fetch Senate List record for (institutionId, matricNo)
      const senateSnap = await db()
        .collection("senateLists")
        .where("matricNo", "==", updated.matricNo)
        .get();
      const senateDocs = docsOf<SenateRecord>(senateSnap);
      const senate = senateDocs.find((s) => s.institutionId === updated.institutionId) ?? senateDocs[0] ?? null;

      // Check duplicates across other corpsMembers
      const allMembersSnap = await db().collection("corpsMembers").get();
      const allMembers = docsOf<CorpsMember>(allMembersSnap);
      const duplicateNinOrMatric = allMembers.some(
        (m) =>
          m.uid !== updated.uid &&
          (m.nin === updated.nin || m.matricNo.toUpperCase() === updated.matricNo.toUpperCase()),
      );

      // Fetch batch mobilizationDate
      const batchSnap = await db().collection("batches").doc(updated.batchId).get();
      const batch = batchSnap.data() as Batch | undefined;
      const mobilizationDate = batch?.mobilizationDate ?? "2026-05-15";
      const maxAge = batch?.maxAge ?? 30;

      const checkResult = runVerificationChecks({
        member: updated,
        nimc,
        senate,
        duplicateNinOrMatric,
        mobilizationDate,
        maxAge,
      });

      updated.status = checkResult.status;
      updated.flags = checkResult.flags;
      updated.submittedAt = nowIso();
      if (checkResult.passed) {
        updated.verifiedAt = nowIso();
        if (senate) {
          await db().collection("senateLists").doc(senate.id).update({ used: true });
        }
      }

      await memberRef.set(updated as unknown as Record<string, unknown>);

      await writeAudit({
        action: checkResult.passed ? "MEMBER_VERIFICATION_PASSED" : "MEMBER_VERIFICATION_FLAGGED",
        actorUid: user.uid,
        actorRole: "corps_member",
        actorName: `${updated.firstName} ${updated.surname}`,
        targetType: "corpsMember",
        targetId: user.uid,
        details: {
          nin: updated.nin,
          matricNo: updated.matricNo,
          status: updated.status,
          flags: updated.flags,
          ageAtMobilization: checkResult.ageAtMobilization,
        },
      });

      await notifyUser({
        uid: user.uid,
        email: updated.email,
        phone: updated.phone,
        title: checkResult.passed
          ? "Verification Successful — Queued for State Posting"
          : "Submission Sent for Admin & School Review",
        body: checkResult.passed
          ? `Your NIN (${updated.nin}) and School Senate List credentials matched. You are now VERIFIED for automated state posting.`
          : `Your submission was flagged (${updated.flags.map((f) => FLAG_LABEL[f]).join("; ")}) and routed to the NYSC Admin & School Verification Queue.`,
        type: checkResult.passed ? "success" : "warning",
        link: "/member/dashboard",
      });

      // Notify NYSC Admin of the student submission
      await notifyUser({
        uid: "usr_admin_01",
        title: checkResult.passed
          ? `Student Auto-Verified: ${updated.surname} ${updated.firstName}`
          : `Action Required — Student Flagged: ${updated.surname} ${updated.firstName}`,
        body: checkResult.passed
          ? `${updated.surname} ${updated.firstName} (${updated.matricNo}) passed NIMC + Senate List checks and is ready for posting.`
          : `${updated.surname} ${updated.firstName} (${updated.matricNo}) submitted with flags: ${updated.flags.join(", ")}. Click to review and approve.`,
        type: checkResult.passed ? "info" : "action",
        link: "/admin/verification",
      });

      // If missing from Senate List, also notify the Institution Officer
      if (updated.flags.includes("NOT_ON_SENATE_LIST")) {
        await notifyUser({
          uid: "usr_inst_01",
          title: `Graduate Confirmation Needed: ${updated.surname} ${updated.firstName}`,
          body: `${updated.surname} ${updated.firstName} (${updated.matricNo}) registered claiming ${updated.institutionName}. Confirm on Senate List page.`,
          type: "action",
          link: "/institution/senate-list",
        });
      }

      return NextResponse.json({ member: updated, verification: checkResult });
    }

    await memberRef.set(updated as unknown as Record<string, unknown>);
    return NextResponse.json({ member: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
