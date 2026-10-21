import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { categoryOf } from "@/lib/constants/courses";
import { adminAuth, db, nowIso } from "@/lib/firebase/admin";
import { signLocalToken } from "@/lib/firebase/localStore";
import { cookieOptions, SESSION_COOKIE, SESSION_DAYS } from "@/lib/firebase/session";
import { DEFAULT_BATCH_ID, SEED_INSTITUTIONS } from "@/lib/seedData";
import { writeAudit } from "@/lib/services/audit";
import { notifyUser } from "@/lib/services/notify";
import type { AppUser, CorpsMember } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email: string;
      password: string;
      surname: string;
      firstName: string;
      otherNames?: string;
      gender: "M" | "F";
      dob: string;
      nin: string;
      matricNo: string;
      institutionId: string;
      stateOfOrigin: string;
      phone: string;
      course: string;
      qualification: string;
      classOfDegree: string;
      graduationYear: number;
    };

    if (!body.email || !body.password || !body.surname || !body.firstName || !body.nin || !body.matricNo) {
      return NextResponse.json({ error: "Please complete all required registration fields." }, { status: 400 });
    }

    const displayName = `${body.firstName.trim()} ${body.surname.trim()}`;
    const created = await adminAuth().createUser({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      displayName,
    });
    await adminAuth().setCustomUserClaims(created.uid, { role: "corps_member" });

    const now = nowIso();
    const appUser: AppUser = {
      uid: created.uid,
      email: created.email,
      displayName,
      role: "corps_member",
      createdAt: now,
    };
    await db().collection("users").doc(created.uid).set(appUser as unknown as Record<string, unknown>);

    const instSnap = await db().collection("institutions").doc(body.institutionId).get();
    const instName =
      (instSnap.data()?.name as string | undefined) ??
      SEED_INSTITUTIONS.find((i) => i.id === body.institutionId)?.name ??
      "Accredited Institution";
    const isForeign =
      (instSnap.data()?.type as string | undefined) === "foreign" ||
      body.institutionId === "inst_uk_leeds";

    const member: CorpsMember = {
      uid: created.uid,
      email: created.email,
      nin: body.nin.trim(),
      matricNo: body.matricNo.trim().toUpperCase(),
      institutionId: body.institutionId,
      institutionName: instName,
      surname: body.surname.trim(),
      firstName: body.firstName.trim(),
      otherNames: body.otherNames?.trim() || undefined,
      gender: body.gender || "M",
      dob: body.dob,
      stateOfOrigin: body.stateOfOrigin,
      phone: body.phone.trim(),
      course: body.course,
      courseCategory: categoryOf(body.course),
      qualification: body.qualification || "B.Sc",
      classOfDegree: body.classOfDegree || "Second Class Upper",
      graduationYear: Number(body.graduationYear) || 2025,
      isForeignTrained: isForeign,
      batchId: DEFAULT_BATCH_ID,
      preferences: [],
      riskConsent: false,
      hasPhoto: true,
      hasCertificate: true,
      status: "REGISTERED",
      flags: [],
      createdAt: now,
    };
    await db().collection("corpsMembers").doc(created.uid).set(member as unknown as Record<string, unknown>);

    // Create session cookie immediately
    const idToken = signLocalToken({
      uid: created.uid,
      email: created.email,
      name: displayName,
      role: "corps_member",
    });
    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_DAYS * 86400 * 1000,
    });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, sessionCookie, cookieOptions(SESSION_DAYS * 86400));

    await writeAudit({
      action: "CORPS_MEMBER_REGISTERED",
      actorUid: created.uid,
      actorRole: "corps_member",
      actorName: displayName,
      targetType: "corpsMember",
      targetId: created.uid,
      details: { nin: member.nin, matricNo: member.matricNo, institutionId: member.institutionId },
    });

    await notifyUser({
      uid: created.uid,
      email: created.email,
      phone: member.phone,
      title: "Welcome to NYSC NAPS",
      body: "Account registered. Select your 4 preferred states and submit your profile for automated NIMC & Senate List verification.",
      type: "action",
      link: "/member/preferences",
    });

    await notifyUser({
      uid: "usr_admin_01",
      title: `New Student Registered: ${member.surname} ${member.firstName}`,
      body: `${member.surname} ${member.firstName} (${member.matricNo}, ${member.institutionName}) created a PCM account and is visible in the Admin Verification & Submissions queue.`,
      type: "info",
      link: "/admin/verification",
    });

    return NextResponse.json({ uid: created.uid, nextPath: "/member/dashboard" });
  } catch (err) {
    return handleApiError(err);
  }
}
