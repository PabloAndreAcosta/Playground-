import { randomUUID } from "crypto";
import { getDb } from "./sqlite/db";
import type {
  SignerRole,
  SignAction,
  AuditEventType,
  ConsentSessionRow,
  BankIdSignatureRow,
  PendingOrderRow,
  AuditLogRow,
} from "./supabase/types";

/**
 * SQLite-based DAL — persistent local storage.
 * Same interface as dal-supabase.ts and dal-mock.ts.
 *
 * SQLite stores JSON as TEXT and booleans as INTEGER (0/1),
 * so we normalize on read.
 */

function toSession(row: Record<string, unknown>): ConsentSessionRow {
  return {
    ...row,
    agreements: JSON.parse(row.agreements as string),
    initiator_confirmed_after: Boolean(row.initiator_confirmed_after),
    partner_confirmed_after: Boolean(row.partner_confirmed_after),
  } as ConsentSessionRow;
}

function toAuditLog(row: Record<string, unknown>): AuditLogRow {
  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
  } as AuditLogRow;
}

// --- Sessions ---

export async function createSession(params: {
  agreements: string[];
  beforeNotes?: string;
  shareToken: string;
}): Promise<ConsentSessionRow> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO consent_sessions (id, status, agreements, before_notes, share_token, created_at)
    VALUES (?, 'pending_initiator', ?, ?, ?, ?)
  `).run(id, JSON.stringify(params.agreements), params.beforeNotes ?? null, params.shareToken, now);

  return getSession(id);
}

export async function getSession(id: string): Promise<ConsentSessionRow> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM consent_sessions WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Session not found: ${id}`);
  return toSession(row);
}

export async function getSessionByShareToken(token: string): Promise<ConsentSessionRow> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM consent_sessions WHERE share_token = ?").get(token) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Session not found for token: ${token}`);
  return toSession(row);
}

export async function listSessions(): Promise<ConsentSessionRow[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM consent_sessions ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(toSession);
}

export async function updateSession(
  id: string,
  updates: Partial<ConsentSessionRow>
): Promise<ConsentSessionRow> {
  const db = getDb();
  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = ?`);
    if (key === "agreements") {
      values.push(JSON.stringify(value));
    } else if (typeof value === "boolean") {
      values.push(value ? 1 : 0);
    } else {
      values.push(value ?? null);
    }
  }

  if (setClauses.length > 0) {
    values.push(id);
    db.prepare(`UPDATE consent_sessions SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);
  }

  return getSession(id);
}

export async function deleteSession(id: string): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM consent_sessions WHERE id = ?").run(id);
}

// --- BankID Signatures ---

export async function storeSignature(params: {
  sessionId: string;
  signerRole: SignerRole;
  action: SignAction;
  bankidOrderRef: string;
  signature: string;
  ocspResponse: string;
  signedText: string;
  signerName: string;
  signerPnrEncrypted: string;
  signerPnrIv: string;
  ipAddress?: string;
}): Promise<BankIdSignatureRow> {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO bankid_signatures
      (id, session_id, signer_role, action, bankid_order_ref, signature,
       ocsp_response, signed_text, signer_name, signer_pnr_encrypted,
       signer_pnr_iv, ip_address, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, params.sessionId, params.signerRole, params.action,
    params.bankidOrderRef, params.signature, params.ocspResponse,
    params.signedText, params.signerName, params.signerPnrEncrypted,
    params.signerPnrIv, params.ipAddress ?? null, now
  );

  return db.prepare("SELECT * FROM bankid_signatures WHERE id = ?").get(id) as BankIdSignatureRow;
}

export async function getSignaturesForSession(sessionId: string): Promise<BankIdSignatureRow[]> {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM bankid_signatures WHERE session_id = ? ORDER BY completed_at ASC"
  ).all(sessionId) as BankIdSignatureRow[];
}

// --- Pending BankID Orders ---

export async function createPendingOrder(params: {
  orderRef: string;
  sessionId: string;
  signerRole: SignerRole;
  action: SignAction;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
}): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO pending_bankid_orders
      (order_ref, session_id, signer_role, action, auto_start_token,
       qr_start_token, qr_start_secret, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    params.orderRef, params.sessionId, params.signerRole, params.action,
    params.autoStartToken, params.qrStartToken, params.qrStartSecret, now
  );
}

export async function getPendingOrder(orderRef: string): Promise<PendingOrderRow> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM pending_bankid_orders WHERE order_ref = ?").get(orderRef) as PendingOrderRow | undefined;
  if (!row) throw new Error(`Pending order not found: ${orderRef}`);
  return row;
}

export async function updatePendingOrderStatus(
  orderRef: string,
  status: "complete" | "failed"
): Promise<void> {
  const db = getDb();
  db.prepare("UPDATE pending_bankid_orders SET status = ? WHERE order_ref = ?").run(status, orderRef);
}

// --- Audit Log ---

export async function logAuditEvent(params: {
  sessionId: string;
  eventType: AuditEventType;
  actorRole?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO audit_log (session_id, event_type, actor_role, actor_name, metadata, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.sessionId, params.eventType,
    params.actorRole ?? null, params.actorName ?? null,
    params.metadata ? JSON.stringify(params.metadata) : null,
    params.ipAddress ?? null, now
  );
}

export async function getAuditLog(sessionId: string): Promise<AuditLogRow[]> {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM audit_log WHERE session_id = ? ORDER BY created_at ASC"
  ).all(sessionId) as Record<string, unknown>[];
  return rows.map(toAuditLog);
}
