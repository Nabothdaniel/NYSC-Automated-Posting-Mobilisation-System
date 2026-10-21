import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { adminAuth, db, hasFirebaseCredentials } from "@/lib/firebase/admin";
import { signLocalToken } from "@/lib/firebase/localStore";
import {
  cookieOptions,
  MFA_COOKIE,
  SESSION_COOKIE,
  SESSION_DAYS,
} from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";
import { MFA_ROLES, ROLE_HOME, type AppUser, type Role } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      idToken?: string;
      email?: string;
      password?: string;
    };

    let tokenToExchange = body.idToken;

    if (!tokenToExchange && body.email && body.password) {
      const verified = await adminAuth().verifyUserPassword(body.email, body.password);
      tokenToExchange = signLocalToken({
        uid: verified.uid,
        email: verified.email,
        name: verified.displayName,
        ...verified.customClaims,
      });
    }

    if (!tokenToExchange) {
      return NextResponse.json({ error: "Missing credentials or ID token" }, { status: 400 });
    }

    const expiresIn = SESSION_DAYS * 86400 * 1000;
    const sessionCookie = await adminAuth().createSessionCookie(tokenToExchange, { expiresIn });
    const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);

    const userSnap = await db().collection("users").doc(decoded.uid).get();
    const userDoc = userSnap.data() as AppUser | undefined;
    const role: Role = (userDoc?.role ?? decoded.role ?? "corps_member") as Role;
    const mfaEnrolled = Boolean(userDoc?.mfaEnabled ?? decoded.mfaEnrolled);

    const jar = await cookies();
    jar.set(SESSION_COOKIE, sessionCookie, cookieOptions(SESSION_DAYS * 86400));
    jar.delete(MFA_COOKIE);

    await writeAudit({
      action: "USER_LOGIN",
      actorUid: decoded.uid,
      actorRole: role,
      actorName: userDoc?.displayName ?? decoded.name,
      targetType: "user",
      targetId: decoded.uid,
      details: { email: decoded.email, mode: hasFirebaseCredentials() ? "firebase" : "local" },
    });

    const needsMfa = MFA_ROLES.includes(role);
    // Only redirect to /2fa if MFA is enrolled on the account; admins can also enrol at /2fa/setup
    const nextPath =
      needsMfa && mfaEnrolled
        ? "/2fa"
        : ROLE_HOME[role] ?? "/member/dashboard";

    return NextResponse.json({
      uid: decoded.uid,
      email: decoded.email,
      role,
      mfaEnrolled,
      nextPath,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(MFA_COOKIE);
  return NextResponse.json({ ok: true });
}
