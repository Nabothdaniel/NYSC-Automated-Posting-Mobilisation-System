import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import type { CourseCategory } from "@/lib/constants/courses";
import { db, nowIso } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";
import { notifyUser } from "@/lib/services/notify";
import type { CorpsMember, Employer, Vacancy } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireApiRole(["employer", "admin"]);
    const body = (await req.json()) as
      | {
          action: "create_vacancy";
          employerId?: string;
          title: string;
          stateCode: string;
          lga: string;
          courseCategories: CourseCategory[];
          preferredQualifications: string[];
          capacity: number;
        }
      | {
          action: "confirm_placement";
          memberUid: string;
        };

    if (body.action === "create_vacancy") {
      const empId = body.employerId || user.orgId || "emp_01";
      const empSnap = await db().collection("employers").doc(empId).get();
      const emp = empSnap.data() as Employer | undefined;
      const ref = db().collection("vacancies").doc();
      const vac: Vacancy = {
        id: ref.id,
        employerId: empId,
        employerName: emp?.name ?? "Registered PPA Organisation",
        stateCode: body.stateCode || emp?.stateCode || "LA",
        lga: body.lga.trim() || emp?.lga || "Ikeja",
        title: body.title.trim(),
        courseCategories: body.courseCategories ?? [],
        preferredQualifications: body.preferredQualifications ?? ["B.Sc", "HND"],
        capacity: Math.max(1, Number(body.capacity) || 5),
        filled: 0,
        active: true,
        createdAt: nowIso(),
      };
      await ref.set(vac as unknown as Record<string, unknown>);

      await writeAudit({
        action: "PPA_VACANCY_CREATED",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "vacancy",
        targetId: vac.id,
        details: { title: vac.title, stateCode: vac.stateCode, capacity: vac.capacity },
      });

      return NextResponse.json({ vacancy: vac });
    }

    if (body.action === "confirm_placement") {
      const mRef = db().collection("corpsMembers").doc(body.memberUid);
      const mSnap = await mRef.get();
      if (!mSnap.exists) {
        return NextResponse.json({ error: "Corps member not found" }, { status: 404 });
      }
      const member = mSnap.data() as CorpsMember;
      if (!member.ppa) {
        return NextResponse.json({ error: "Member has no PPA match to confirm" }, { status: 400 });
      }
      const updatedPpa = {
        ...member.ppa,
        acceptedAt: member.ppa.acceptedAt ?? nowIso(),
        confirmedAt: nowIso(),
      };
      await mRef.update({
        status: "DEPLOYED",
        ppa: updatedPpa,
      });

      await writeAudit({
        action: "EMPLOYER_CONFIRMED_DEPLOYMENT",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "corpsMember",
        targetId: member.uid,
        details: {
          employerName: member.ppa.employerName,
          title: member.ppa.title,
        },
      });

      await notifyUser({
        uid: member.uid,
        email: member.email,
        phone: member.phone,
        title: `Primary Assignment Confirmed — Status: DEPLOYED`,
        body: `${member.ppa.employerName} has confirmed your assumption of duty as ${member.ppa.title}. Your final PPA Posting Letter is ready.`,
        type: "success",
        link: "/member/letters",
      });

      return NextResponse.json({ ok: true, status: "DEPLOYED" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}
