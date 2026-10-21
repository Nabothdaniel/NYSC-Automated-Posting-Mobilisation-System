import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { adminAuth, db, nowIso } from "@/lib/firebase/admin";
import { resetLocalStore } from "@/lib/firebase/localStore";
import { requireApiRole } from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";
import type { AppUser, Role } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireApiRole(["admin"]);
    const body = (await req.json()) as
      | { action: "reset_demo" }
      | {
          action?: "invite";
          email: string;
          password?: string;
          displayName: string;
          role: Role;
          orgId?: string;
        };

    if ("action" in body && body.action === "reset_demo") {
      resetLocalStore();
      return NextResponse.json({ ok: true, message: "Simulated database reset to initial seed state." });
    }

    const inv = body as {
      email: string;
      password?: string;
      displayName: string;
      role: Role;
      orgId?: string;
    };

    if (!inv.email || !inv.displayName || !inv.role) {
      return NextResponse.json({ error: "Email, display name and role are required." }, { status: 400 });
    }

    const created = await adminAuth().createUser({
      email: inv.email.trim().toLowerCase(),
      password: inv.password || "Password123!",
      displayName: inv.displayName.trim(),
    });
    await adminAuth().setCustomUserClaims(created.uid, {
      role: inv.role,
      orgId: inv.orgId || undefined,
    });

    const newUser: AppUser = {
      uid: created.uid,
      email: created.email,
      displayName: inv.displayName.trim(),
      role: inv.role,
      orgId: inv.orgId || undefined,
      mfaEnabled: false,
      createdAt: nowIso(),
    };
    await db().collection("users").doc(created.uid).set(newUser as unknown as Record<string, unknown>);

    await writeAudit({
      action: "USER_INVITED",
      actorUid: user.uid,
      actorRole: user.role,
      actorName: user.name,
      targetType: "user",
      targetId: created.uid,
      details: { email: newUser.email, role: newUser.role, orgId: newUser.orgId },
    });

    return NextResponse.json({ user: newUser });
  } catch (err) {
    return handleApiError(err);
  }
}
