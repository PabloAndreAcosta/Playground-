import { supabase } from "./supabase/client";
import type { AuditEventType } from "./supabase/types";

export async function logAuditEvent(params: {
  sessionId: string;
  eventType: AuditEventType;
  actorRole?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  const { error } = await supabase()
    .from("audit_log")
    .insert({
      session_id: params.sessionId,
      event_type: params.eventType,
      actor_role: params.actorRole ?? null,
      actor_name: params.actorName ?? null,
      metadata: params.metadata ?? null,
      ip_address: params.ipAddress ?? null,
    });

  if (error) {
    console.error("Failed to write audit log:", error);
  }
}
