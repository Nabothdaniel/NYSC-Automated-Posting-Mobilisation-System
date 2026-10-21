import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import type { RiskLevel } from "@/lib/constants/states";
import { db, nowIso } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import { writeAudit } from "@/lib/services/audit";
import type { SecurityIncident, StateDoc } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const user = await requireApiRole(["security", "admin"]);
    const body = (await req.json()) as
      | {
          action: "update_state_risk";
          stateCode: string;
          riskLevel: RiskLevel;
          note?: string;
        }
      | {
          action: "log_incident";
          stateCode: string;
          lga: string;
          type: SecurityIncident["type"];
          severity: 1 | 2 | 3 | 4 | 5;
          date: string;
          description: string;
          escalateRiskTo?: RiskLevel;
        };

    if (body.action === "update_state_risk") {
      const ref = db().collection("states").doc(body.stateCode);
      const snap = await ref.get();
      const prev = snap.data() as StateDoc | undefined;

      await ref.update({
        riskLevel: body.riskLevel,
        note: body.note?.trim() ?? prev?.note ?? "",
        lastUpdated: nowIso(),
        updatedBy: user.uid,
      });

      await writeAudit({
        action: "STATE_SECURITY_RISK_UPDATED",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "state",
        targetId: body.stateCode,
        details: {
          previousRisk: prev?.riskLevel,
          newRisk: body.riskLevel,
          note: body.note,
        },
      });

      return NextResponse.json({ ok: true, stateCode: body.stateCode, riskLevel: body.riskLevel });
    }

    if (body.action === "log_incident") {
      const incRef = db().collection("securityIncidents").doc();
      const incident: SecurityIncident = {
        id: incRef.id,
        stateCode: body.stateCode,
        lga: body.lga.trim(),
        type: body.type,
        severity: body.severity,
        date: body.date || nowIso().slice(0, 10),
        description: body.description.trim(),
        reportedBy: user.uid,
        createdAt: nowIso(),
      };
      await incRef.set(incident as unknown as Record<string, unknown>);

      const stateRef = db().collection("states").doc(body.stateCode);
      const stateSnap = await stateRef.get();
      const stateData = stateSnap.data() as StateDoc | undefined;
      const patch: Record<string, unknown> = {
        incidentCount: (stateData?.incidentCount ?? 0) + 1,
        lastUpdated: nowIso(),
        updatedBy: user.uid,
      };
      if (body.escalateRiskTo) {
        patch.riskLevel = body.escalateRiskTo;
      }
      await stateRef.update(patch);

      await writeAudit({
        action: "SECURITY_INCIDENT_LOGGED",
        actorUid: user.uid,
        actorRole: user.role,
        actorName: user.name,
        targetType: "state",
        targetId: body.stateCode,
        details: {
          incidentId: incident.id,
          lga: incident.lga,
          type: incident.type,
          severity: incident.severity,
          escalatedTo: body.escalateRiskTo,
        },
      });

      return NextResponse.json({ incident });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}
