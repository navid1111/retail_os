import { AuditLog, AuditAction, AuditEntityType } from "../models/AuditLog.model";

export interface AuditLogInput {
  actorId?: string;
  action: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  meta?: Record<string, unknown>;
}

export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await AuditLog.create({
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      meta: input.meta,
    });
  } catch (error) {
    // Fire-and-forget: do not block the caller on audit log failures.
    console.error("Audit log write failed:", error);
  }
}
