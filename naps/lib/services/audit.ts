import "server-only";
import { db, nowIso } from "../firebase/admin";
import type { AuditLog, Role } from "../types";

export interface WriteAuditInput {
  id?: string;
  action: string;
  actorUid: string;
  actorRole: Role | "system";
  actorName?: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  runId?: string;
}

export async function writeAudit(input: WriteAuditInput): Promise<AuditLog> {
  const ref = input.id ? db().collection("auditLogs").doc(input.id) : db().collection("auditLogs").doc();
  const entry: AuditLog = {
    id: ref.id,
    action: input.action,
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    actorName: input.actorName,
    targetType: input.targetType,
    targetId: input.targetId,
    details: input.details,
    runId: input.runId,
    timestamp: nowIso(),
  };
  await ref.set(entry as unknown as Record<string, unknown>);
  return entry;
}
