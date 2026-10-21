import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { handleApiError } from "@/lib/apiHandler";
import { adminAuth, db } from "@/lib/firebase/admin";
import {
  cookieOptions,
  makeMfaToken,
  MFA_COOKIE,
  requireApiSession,
  SESSION_DAYS,
} from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";

export async function GET() {
  try {
    const user = await requireApiSession();
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, "NYSC-NAPS", secret);
    const qrDataUrl = await QRCode.toDataURL(otpauth, { width: 220, margin: 1 });

    await db().collection("userSecrets").doc(user.uid).set(
      {
        pendingSecret: secret,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return NextResponse.json({
      secret,
      qrDataUrl,
      mfaEnrolled: user.mfaEnrolled,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireApiSession();
    const body = (await req.json()) as { code?: string; action?: "enable" | "disable" };

    if (body.action === "disable") {
      await db().collection("users").doc(user.uid).update({ mfaEnabled: false });
      await adminAuth().setCustomUserClaims(user.uid, { role: user.role, orgId: user.orgId, mfaEnrolled: false });
      const jar = await cookies();
      jar.delete(MFA_COOKIE);
      await writeAudit({
        action: "ADMIN_2FA_DISABLED",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "user",
        targetId: user.uid,
        details: {},
      });
      return NextResponse.json({ ok: true, mfaEnrolled: false });
    }

    const code = (body.code || "").replace(/\s+/g, "");
    const secSnap = await db().collection("userSecrets").doc(user.uid).get();
    const pendingSecret = secSnap.data()?.pendingSecret as string | undefined;
    if (!pendingSecret) {
      return NextResponse.json({ error: "No pending 2FA setup found. Refresh QR code." }, { status: 400 });
    }

    authenticator.options = { window: 1 };
    const isValid = authenticator.check(code, pendingSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid 6-digit authenticator code. Try again." }, { status: 400 });
    }

    // Generate 8 one-time backup codes
    const plainBackupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase(),
    );
    const hashedCodes = await Promise.all(plainBackupCodes.map((c) => bcrypt.hash(c, 8)));

    await db().collection("userSecrets").doc(user.uid).set({
      secret: pendingSecret,
      pendingSecret: null,
      backupCodes: hashedCodes,
      enrolledAt: new Date().toISOString(),
    });
    await db().collection("users").doc(user.uid).update({ mfaEnabled: true });
    await adminAuth().setCustomUserClaims(user.uid, { role: user.role, orgId: user.orgId, mfaEnrolled: true });

    const jar = await cookies();
    jar.set(MFA_COOKIE, makeMfaToken(user.uid), cookieOptions(SESSION_DAYS * 86400));

    await writeAudit({
      action: "ADMIN_2FA_ENROLLED",
      actorUid: user.uid,
      actorRole: user.role,
      actorName: user.name,
      targetType: "user",
      targetId: user.uid,
      details: { backupCodesGenerated: 8 },
    });

    return NextResponse.json({
      ok: true,
      backupCodes: plainBackupCodes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
