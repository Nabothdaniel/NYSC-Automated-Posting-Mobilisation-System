import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { db, docsOf, nowIso } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";
import { notifyUser } from "@/lib/services/notify";
import type { Batch, CorpsMember, NimcRecord, SenateRecord } from "@/lib/types";
import { runVerificationChecks } from "@/lib/verification/checks";

export interface SenateUploadItem {
  matricNo: string;
  fullName: string;
  dob: string;
  course: string;
  graduationYear: number;
  classOfDegree: string;
  nin?: string;
  stateOfOrigin?: string;
  gender?: "M" | "F";
}

export async function POST(req: Request) {
  try {
    const user = await requireApiRole(["institution", "admin"]);
    const body = (await req.json()) as {
      institutionId?: string;
      records: SenateUploadItem[];
    };

    const institutionId = body.institutionId || user.orgId || "inst_nsuk";
    const records = body.records ?? [];
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No graduate records provided." }, { status: 400 });
    }

    const now = nowIso();
    const created: SenateRecord[] = [];
    let autoVerifiedCount = 0;

    // Fetch existing members so we can auto-verify any waiting student whose Matric No was just uploaded
    const allMembersSnap = await db().collection("corpsMembers").get();
    const allMembers = docsOf<CorpsMember>(allMembersSnap);

    for (const item of records) {
      if (!item.matricNo || !item.fullName || !item.dob || !item.course) continue;
      const cleanMatric = item.matricNo.trim().toUpperCase();
      const docId = `sen_${institutionId}_${cleanMatric.replace(/[^A-Z0-9]/g, "_")}`;
      const record: SenateRecord = {
        id: docId,
        institutionId,
        matricNo: cleanMatric,
        fullName: item.fullName.trim(),
        dob: item.dob.trim(),
        course: item.course.trim(),
        graduationYear: Number(item.graduationYear) || 2025,
        classOfDegree: item.classOfDegree?.trim() || "Second Class Upper",
        used: false,
        uploadedAt: now,
        uploadedBy: user.uid,
      };

      // If NIN is also supplied, seed mock NIMC record for seamless verification testing
      if (item.nin && item.nin.trim().length >= 8) {
        const parts = item.fullName.trim().split(/\s+/);
        const nimc: NimcRecord = {
          nin: item.nin.trim(),
          surname: parts[0] || "Graduate",
          firstName: parts.slice(1).join(" ") || "Student",
          dob: item.dob.trim(),
          gender: item.gender === "F" ? "F" : "M",
          stateOfOrigin: item.stateOfOrigin?.trim().toUpperCase() || "NA",
        };
        await db()
          .collection("nimcRecords")
          .doc(nimc.nin)
          .set(nimc as unknown as Record<string, unknown>, { merge: true });
      }

      // Check if a registered/flagged student is waiting on this Senate List record
      const matchingStudent = allMembers.find(
        (m) =>
          m.matricNo.toUpperCase() === cleanMatric &&
          (m.status === "REGISTERED" || m.status === "FLAGGED"),
      );

      if (matchingStudent) {
        const nimcSnap = await db().collection("nimcRecords").doc(matchingStudent.nin).get();
        const nimc = nimcSnap.exists ? (nimcSnap.data() as NimcRecord) : null;
        const batchSnap = await db().collection("batches").doc(matchingStudent.batchId).get();
        const batch = batchSnap.data() as Batch | undefined;

        const check = runVerificationChecks({
          member: matchingStudent,
          nimc,
          senate: record,
          duplicateNinOrMatric: false,
          mobilizationDate: batch?.mobilizationDate ?? "2026-05-15",
          maxAge: batch?.maxAge ?? 30,
        });

        await db()
          .collection("corpsMembers")
          .doc(matchingStudent.uid)
          .update({
            status: check.status,
            flags: check.flags,
            verifiedAt: check.passed ? now : undefined,
          });

        if (check.passed) {
          record.used = true;
          autoVerifiedCount += 1;
          await notifyUser({
            uid: matchingStudent.uid,
            email: matchingStudent.email,
            phone: matchingStudent.phone,
            title: "School Senate List Confirmed — Status: VERIFIED",
            body: `Your institution uploaded your Senate List record (${cleanMatric}). Your account is now VERIFIED and queued for state posting.`,
            type: "success",
            link: "/member/dashboard",
          });
        }
      }

      await db()
        .collection("senateLists")
        .doc(docId)
        .set(record as unknown as Record<string, unknown>);
      created.push(record);
    }

    await writeAudit({
      action: "SENATE_LIST_UPLOADED",
      actorUid: user.uid,
      actorRole: user.role,
      actorName: user.name,
      targetType: "institution",
      targetId: institutionId,
      details: { count: created.length, autoVerifiedCount },
    });

    return NextResponse.json({
      uploaded: created.length,
      autoVerifiedCount,
      records: created,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
