/**
 * Audit log - routes to mock (in-memory) or Supabase implementation.
 */

import type { AuditEventType } from "./supabase/types";

const useMock = process.env.SUPABASE_MOCK === "true";

const impl = useMock
  ? require("./dal-mock")
  : require("./audit-supabase");

export const logAuditEvent: (params: {
  sessionId: string;
  eventType: AuditEventType;
  actorRole?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) => Promise<void> = impl.logAuditEvent;
