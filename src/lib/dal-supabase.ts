import { supabase } from "./supabase/client";
import type {
  SessionStatus,
  SignerRole,
  SignAction,
  ConsentSessionRow,
  BankIdSignatureRow,
  PendingOrderRow,
  AuditLogRow,
} from "./supabase/types";

// --- Sessions ---

export async function createSession(params: {
  agreements: string[];
  beforeNotes?: string;
  shareToken: string;
}): Promise<ConsentSessionRow> {
  const { data, error } = await supabase()
    .from("consent_sessions")
    .insert({
      agreements: params.agreements,
      before_notes: params.beforeNotes ?? null,
      share_token: params.shareToken,
      status: "pending_initiator",
    })
    .select()
    .single();

  if (error) throw error;
  return data as ConsentSessionRow;
}

export async function getSession(id: string): Promise<ConsentSessionRow> {
  const { data, error } = await supabase()
    .from("consent_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as ConsentSessionRow;
}

export async function getSessionByShareToken(
  token: string
): Promise<ConsentSessionRow> {
  const { data, error } = await supabase()
    .from("consent_sessions")
    .select("*")
    .eq("share_token", token)
    .single();

  if (error) throw error;
  return data as ConsentSessionRow;
}

export async function listSessions(): Promise<ConsentSessionRow[]> {
  const { data, error } = await supabase()
    .from("consent_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ConsentSessionRow[];
}

export async function updateSession(
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
): Promise<ConsentSessionRow> {
  const { data, error } = await supabase()
    .from("consent_sessions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ConsentSessionRow;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase()
    .from("consent_sessions")
    .delete()
    .eq("id", id);

  if (error) throw error;
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
  const { data, error } = await supabase()
    .from("bankid_signatures")
    .insert({
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
    })
    .select()
    .single();

  if (error) throw error;
  return data as BankIdSignatureRow;
}

export async function getSignaturesForSession(
  sessionId: string
): Promise<BankIdSignatureRow[]> {
  const { data, error } = await supabase()
    .from("bankid_signatures")
    .select("*")
    .eq("session_id", sessionId)
    .order("completed_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BankIdSignatureRow[];
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
  const { error } = await supabase()
    .from("pending_bankid_orders")
    .insert({
      order_ref: params.orderRef,
      session_id: params.sessionId,
      signer_role: params.signerRole,
      action: params.action,
      auto_start_token: params.autoStartToken,
      qr_start_token: params.qrStartToken,
      qr_start_secret: params.qrStartSecret,
      status: "pending",
    });

  if (error) throw error;
}

export async function getPendingOrder(
  orderRef: string
): Promise<PendingOrderRow> {
  const { data, error } = await supabase()
    .from("pending_bankid_orders")
    .select("*")
    .eq("order_ref", orderRef)
    .single();

  if (error) throw error;
  return data as PendingOrderRow;
}

export async function updatePendingOrderStatus(
  orderRef: string,
  status: "complete" | "failed"
): Promise<void> {
  const { error } = await supabase()
    .from("pending_bankid_orders")
    .update({ status })
    .eq("order_ref", orderRef);

  if (error) throw error;
}

// --- Audit Log ---

export async function getAuditLog(
  sessionId: string
): Promise<AuditLogRow[]> {
  const { data, error } = await supabase()
    .from("audit_log")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AuditLogRow[];
}
