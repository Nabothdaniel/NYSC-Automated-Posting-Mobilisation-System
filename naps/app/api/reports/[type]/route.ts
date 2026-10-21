import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/apiHandler";
import { STATE_BY_CODE, stateName } from "@/lib/constants/states";
import { db, docsOf } from "@/lib/firebase/admin";
import { requireApiRole } from "@/lib/firebase/session";
import type { AuditLog, Camp, CorpsMember, StateDoc } from "@/lib/types";

function toCsv(headers: string[], rows: (string | number | boolean | undefined)[][]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ type: string }> },
) {
  try {
    await requireApiRole(["admin", "auditor"]);
    const { type } = await context.params;

    if (type === "allocations") {
      const snap = await db().collection("corpsMembers").get();
      const members = docsOf<CorpsMember>(snap);
      const csv = toCsv(
        [
          "UID",
          "Surname",
          "FirstName",
          "Gender",
          "MatricNo",
          "Institution",
          "Course",
          "Category",
          "OriginState",
          "OriginZone",
          "Status",
          "PostedState",
          "PostedZone",
          "Camp",
          "CallUpNo",
          "TopsisScore",
          "PPAEmployer",
          "PPARole",
        ],
        members.map((m) => [
          m.uid,
          m.surname,
          m.firstName,
          m.gender,
          m.matricNo,
          m.institutionName,
          m.course,
          m.courseCategory,
          stateName(m.stateOfOrigin),
          STATE_BY_CODE[m.stateOfOrigin]?.zone ?? "",
          m.status,
          m.allocation ? stateName(m.allocation.stateCode) : "",
          m.allocation ? STATE_BY_CODE[m.allocation.stateCode]?.zone ?? "" : "",
          m.allocation?.campName ?? "",
          m.allocation?.callUpNo ?? "",
          m.allocation?.score ?? "",
          m.ppa?.employerName ?? "",
          m.ppa?.title ?? "",
        ]),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="naps-allocations-report.csv"',
        },
      });
    }

    if (type === "states") {
      const [statesSnap, campsSnap] = await Promise.all([
        db().collection("states").get(),
        db().collection("camps").get(),
      ]);
      const states = docsOf<StateDoc>(statesSnap);
      const campByState = new Map(docsOf<Camp>(campsSnap).map((c) => [c.stateCode, c]));
      const csv = toCsv(
        ["Code", "State", "Zone", "RiskLevel", "Incidents", "CampName", "Capacity", "Occupied"],
        states.map((s) => {
          const c = campByState.get(s.code);
          return [s.code, s.name, s.zone, s.riskLevel, s.incidentCount, c?.name ?? "", c?.capacity ?? 0, c?.occupied ?? 0];
        }),
      );
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="naps-states-security-capacity.csv"',
        },
      });
    }

    const logsSnap = await db().collection("auditLogs").get();
    const logs = docsOf<AuditLog>(logsSnap).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const csv = toCsv(
      ["Timestamp", "Action", "ActorRole", "ActorName", "TargetType", "TargetId", "RunId", "DetailsJSON"],
      logs.map((l) => [
        l.timestamp,
        l.action,
        l.actorRole,
        l.actorName ?? l.actorUid,
        l.targetType,
        l.targetId,
        l.runId ?? "",
        JSON.stringify(l.details),
      ]),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="naps-immutable-audit-log.csv"',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
