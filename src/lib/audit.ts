/**
 * Audit log — picks the same storage backend as the DAL.
 */

import type { AuditEventType } from "./supabase/types";

function pickImpl() {
  const db = process.env.DATABASE ?? "sqlite";
  if (db === "supabase") return require("./audit-supabase");
  if (db === "sqlite") return require("./dal-sqlite");
  if (process.env.SUPABASE_MOCK === "true") return require("./dal-mock");
  return require("./dal-sqlite");
}

const impl = pickImpl();

export const logAuditEvent: (params: {
  sessionId: string;
  eventType: AuditEventType;
  actorRole?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) => Promise<void> = impl.logAuditEvent;
