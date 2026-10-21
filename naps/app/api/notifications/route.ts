import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { db, docsOf } from "@/lib/firebase/admin";
import { requireApiSession } from "@/lib/firebase/session";
import type { Notification } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireApiSession();
    const snap = await db().collection("notifications").where("uid", "==", user.uid).get();
    const list = docsOf<Notification>(snap).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ notifications: list.slice(0, 20) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireApiSession();
    const { id } = (await req.json()) as { id?: string };
    if (id) {
      await db().collection("notifications").doc(id).update({ read: true });
    } else {
      const snap = await db().collection("notifications").where("uid", "==", user.uid).get();
      for (const d of snap.docs) {
        await db().collection("notifications").doc(d.id).update({ read: true });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
