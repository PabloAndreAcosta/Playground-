/**
 * Data Access Layer - routes to mock (in-memory) or Supabase implementation.
 *
 * Set SUPABASE_MOCK=true in .env.local to use in-memory storage
 * (useful when Supabase is unreachable, e.g. in sandboxed environments).
 */

import type {
  SessionStatus,
  SignerRole,
  SignAction,
  ConsentSessionRow,
  BankIdSignatureRow,
  PendingOrderRow,
  AuditLogRow,
} from "./supabase/types";

const useMock = process.env.SUPABASE_MOCK === "true";

// Dynamic re-export based on environment
const impl = useMock
  ? require("./dal-mock")
  : require("./dal-supabase");

export const createSession: (params: {
  agreements: string[];
  beforeNotes?: string;
  shareToken: string;
}) => Promise<ConsentSessionRow> = impl.createSession;

export const getSession: (id: string) => Promise<ConsentSessionRow> =
  impl.getSession;

export const getSessionByShareToken: (
  token: string
) => Promise<ConsentSessionRow> = impl.getSessionByShareToken;

export const listSessions: () => Promise<ConsentSessionRow[]> =
  impl.listSessions;

export const updateSession: (
  id: string,
  updates: Partial<{
    status: SessionStatus;
    initiator_name: string;
    initiator_pnr_encrypted: string;
    initiator_pnr_iv: string;
    partner_name: string;
    partner_pnr_encrypted: string;
    partner_pnr_iv: string;
    initiator_confirmed_after: boolean;
    partner_confirmed_after: boolean;
    consent_given_at: string;
    confirmation_at: string;
    withdrawn_by: string;
    withdrawn_at: string;
    after_notes: string;
  }>
) => Promise<ConsentSessionRow> = impl.updateSession;

export const deleteSession: (id: string) => Promise<void> =
  impl.deleteSession;

export const storeSignature: (params: {
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
}) => Promise<BankIdSignatureRow> = impl.storeSignature;

export const getSignaturesForSession: (
  sessionId: string
) => Promise<BankIdSignatureRow[]> = impl.getSignaturesForSession;

export const createPendingOrder: (params: {
  orderRef: string;
  sessionId: string;
  signerRole: SignerRole;
  action: SignAction;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
}) => Promise<void> = impl.createPendingOrder;

export const getPendingOrder: (
  orderRef: string
) => Promise<PendingOrderRow> = impl.getPendingOrder;

export const updatePendingOrderStatus: (
  orderRef: string,
  status: "complete" | "failed"
) => Promise<void> = impl.updatePendingOrderStatus;

export const getAuditLog: (
  sessionId: string
) => Promise<AuditLogRow[]> = impl.getAuditLog;
