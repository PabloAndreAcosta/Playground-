import { randomUUID } from "crypto";
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
 * In-memory mock DAL for development/testing without Supabase.
 * Activated by SUPABASE_MOCK=true in .env.local.
 * Data lives only in the server process — lost on restart.
 *
 * Uses globalThis to share state across all route bundles
 * (Next.js Turbopack compiles each route independently).
 */

interface MockStore {
  sessions: Map<string, ConsentSessionRow>;
  signatures: BankIdSignatureRow[];
  pendingOrders: Map<string, PendingOrderRow>;
  auditLogs: AuditLogRow[];
  auditIdCounter: number;
}

const g = globalThis as typeof globalThis & { __mockStore?: MockStore };

if (!g.__mockStore) {
  g.__mockStore = {
    sessions: new Map(),
    signatures: [],
    pendingOrders: new Map(),
    auditLogs: [],
    auditIdCounter: 1,
  };
}

const store = g.__mockStore;

// --- Sessions ---

export async function createSession(params: {
  agreements: string[];
  beforeNotes?: string;
  shareToken: string;
}): Promise<ConsentSessionRow> {
  const now = new Date().toISOString();
  const row: ConsentSessionRow = {
    id: randomUUID(),
    status: "pending_initiator",
    initiator_name: null,
    initiator_pnr_encrypted: null,
    initiator_pnr_iv: null,
    partner_name: null,
    partner_pnr_encrypted: null,
    partner_pnr_iv: null,
    agreements: params.agreements,
    before_notes: params.beforeNotes ?? null,
    after_notes: null,
    initiator_confirmed_after: false,
    partner_confirmed_after: false,
    withdrawn_by: null,
    share_token: params.shareToken,
    created_at: now,
    consent_given_at: null,
    confirmation_at: null,
    withdrawn_at: null,
  };
  store.sessions.set(row.id, row);
  console.log(`[Mock DAL] Session created: ${row.id}`);
  return row;
}

export async function getSession(id: string): Promise<ConsentSessionRow> {
  const row = store.sessions.get(id);
  if (!row) throw new Error(`Session not found: ${id}`);
  return row;
}

export async function getSessionByShareToken(
  token: string
): Promise<ConsentSessionRow> {
  for (const row of store.sessions.values()) {
    if (row.share_token === token) return row;
  }
  throw new Error(`Session not found for token: ${token}`);
}

export async function listSessions(): Promise<ConsentSessionRow[]> {
  return [...store.sessions.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function updateSession(
  id: string,
  updates: Partial<ConsentSessionRow>
): Promise<ConsentSessionRow> {
  const row = store.sessions.get(id);
  if (!row) throw new Error(`Session not found: ${id}`);
  Object.assign(row, updates);
  return row;
}

export async function deleteSession(id: string): Promise<void> {
  store.sessions.delete(id);
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
  const row: BankIdSignatureRow = {
    id: randomUUID(),
    session_id: params.sessionId,
    signer_role: params.signerRole,
    action: params.action,
    bankid_order_ref: params.bankidOrderRef,
    signature: params.signature,
    ocsp_response: params.ocspResponse,
    signed_text: params.signedText,
    signer_name: params.signerName,
    signer_pnr_encrypted: params.signerPnrEncrypted,
    signer_pnr_iv: params.signerPnrIv,
    ip_address: params.ipAddress ?? null,
    completed_at: new Date().toISOString(),
  };
  store.signatures.push(row);
  return row;
}

export async function getSignaturesForSession(
  sessionId: string
): Promise<BankIdSignatureRow[]> {
  return store.signatures
    .filter((s) => s.session_id === sessionId)
    .sort(
      (a, b) =>
        new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
    );
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
  const row: PendingOrderRow = {
    order_ref: params.orderRef,
    session_id: params.sessionId,
    signer_role: params.signerRole,
    action: params.action,
    auto_start_token: params.autoStartToken,
    qr_start_token: params.qrStartToken,
    qr_start_secret: params.qrStartSecret,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  store.pendingOrders.set(params.orderRef, row);
}

export async function getPendingOrder(
  orderRef: string
): Promise<PendingOrderRow> {
  const row = store.pendingOrders.get(orderRef);
  if (!row) throw new Error(`Pending order not found: ${orderRef}`);
  return row;
}

export async function updatePendingOrderStatus(
  orderRef: string,
  status: "complete" | "failed"
): Promise<void> {
  const row = store.pendingOrders.get(orderRef);
  if (row) row.status = status;
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
  const row: AuditLogRow = {
    id: store.auditIdCounter++,
    session_id: params.sessionId,
    event_type: params.eventType,
    actor_role: params.actorRole ?? null,
    actor_name: params.actorName ?? null,
    metadata: params.metadata ?? null,
    ip_address: params.ipAddress ?? null,
    created_at: new Date().toISOString(),
  };
  store.auditLogs.push(row);
  console.log(`[Mock DAL] Audit: ${params.eventType} for session ${params.sessionId}`);
}

export async function getAuditLog(
  sessionId: string
): Promise<AuditLogRow[]> {
  return store.auditLogs
    .filter((l) => l.session_id === sessionId)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
}
