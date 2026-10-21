import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { db, nowIso } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";
import type { Batch } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireApiRole(["admin"]);
    const body = (await req.json()) as
      | {
          action: "create_batch";
          year: number;
          batch: "A" | "B" | "C";
          stream: "I" | "II";
          mobilizationDate: string;
          maxAge?: number;
        }
      | {
          action: "update_batch_status";
          batchId: string;
          status: Batch["status"];
        }
      | {
          action: "update_camp_capacity";
          campId: string;
          capacity: number;
        };

    if (body.action === "create_batch") {
      const id = `batch_${body.year}_${body.batch}_${body.stream}`;
      const batchDoc: Batch = {
        id,
        name: `${body.year} Batch ${body.batch} Stream ${body.stream}`,
        year: Number(body.year),
        batch: body.batch,
        stream: body.stream,
        mobilizationDate: body.mobilizationDate,
        maxAge: Number(body.maxAge ?? 30),
        status: "open",
        createdAt: nowIso(),
      };
      await db().collection("batches").doc(id).set(batchDoc as unknown as Record<string, unknown>);
      await writeAudit({
        action: "BATCH_CREATED",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "batch",
        targetId: id,
        details: { ...batchDoc },
      });
      return NextResponse.json({ batch: batchDoc });
    }

    if (body.action === "update_batch_status") {
      await db().collection("batches").doc(body.batchId).update({ status: body.status });
      await writeAudit({
        action: "BATCH_STATUS_CHANGED",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "batch",
        targetId: body.batchId,
        details: { status: body.status },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update_camp_capacity") {
      const capacity = Math.max(50, Number(body.capacity));
      await db().collection("camps").doc(body.campId).update({ capacity });
      await writeAudit({
        action: "CAMP_CAPACITY_UPDATED",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "camp",
        targetId: body.campId,
        details: { capacity },
      });
      return NextResponse.json({ ok: true, capacity });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}
