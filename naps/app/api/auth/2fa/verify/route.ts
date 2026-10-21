import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticator } from "otplib";
import { handleApiError } from "@/lib/apiHandler";
import { db } from "@/lib/firebase/admin";
import {
  cookieOptions,
  makeMfaToken,
  MFA_COOKIE,
  requireApiSession,
  SESSION_DAYS,
} from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";
import { ROLE_HOME } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireApiSession();
    const { code } = (await req.json()) as { code?: string };
    const cleanCode = (code || "").trim().replace(/\s+/g, "");
    if (!cleanCode) {
      return NextResponse.json({ error: "Enter a 6-digit TOTP code or 8-character backup code." }, { status: 400 });
    }

    const secSnap = await db().collection("userSecrets").doc(user.uid).get();
    const secData = secSnap.data();
    const secret = secData?.secret as string | undefined;
    const backupCodes = (secData?.backupCodes as string[] | undefined) ?? [];

    if (!secret) {
      return NextResponse.json({ error: "2FA is not enrolled for this account." }, { status: 400 });
    }

    authenticator.options = { window: 1 };
    let verified = authenticator.check(cleanCode, secret);
    let usedBackup = false;

    if (!verified && backupCodes.length > 0) {
      for (let i = 0; i < backupCodes.length; i++) {
        if (await bcrypt.compare(cleanCode.toUpperCase(), backupCodes[i]!)) {
          verified = true;
          usedBackup = true;
          const remaining = backupCodes.filter((_, idx) => idx !== i);
          await db().collection("userSecrets").doc(user.uid).update({ backupCodes: remaining });
          break;
        }
      }
    }

    if (!verified) {
      return NextResponse.json({ error: "Invalid authenticator or backup code." }, { status: 400 });
    }

    const jar = await cookies();
    jar.set(MFA_COOKIE, makeMfaToken(user.uid), cookieOptions(SESSION_DAYS * 86400));

    await writeAudit({
      action: "ADMIN_2FA_VERIFIED",
      actorUid: user.uid,
      actorRole: user.role,
      actorName: user.name,
      targetType: "user",
      targetId: user.uid,
      details: { method: usedBackup ? "backup_code" : "totp" },
    });

    return NextResponse.json({
      ok: true,
      nextPath: ROLE_HOME[user.role] ?? "/admin/dashboard",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
