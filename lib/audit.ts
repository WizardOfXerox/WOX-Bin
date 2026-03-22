import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { hashIp } from "@/lib/crypto";

type AuditInput = {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  ip?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAudit(input: AuditInput) {
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    ipHash: hashIp(input.ip),
    metadata: input.metadata ?? {}
  });
}
