export type SessionStatus =
  | "pending_initiator"
  | "pending_partner"
  | "consented"
  | "confirmed"
  | "withdrawn";

export type SignerRole = "initiator" | "partner";

export type SignAction = "consent" | "confirm" | "withdraw";

export type AuditEventType =
  | "session_created"
  | "partner_joined"
  | "consent_signed"
  | "confirmation_signed"
  | "consent_withdrawn"
  | "session_deleted";

export interface ConsentSessionRow {
  id: string;
  status: SessionStatus;
  initiator_name: string | null;
  initiator_pnr_encrypted: string | null;
  initiator_pnr_iv: string | null;
  partner_name: string | null;
  partner_pnr_encrypted: string | null;
  partner_pnr_iv: string | null;
  agreements: string[];
  before_notes: string | null;
  after_notes: string | null;
  initiator_confirmed_after: boolean;
  partner_confirmed_after: boolean;
  withdrawn_by: string | null;
  share_token: string;
  created_at: string;
  consent_given_at: string | null;
  confirmation_at: string | null;
  withdrawn_at: string | null;
}

export interface BankIdSignatureRow {
  id: string;
  session_id: string;
  signer_role: SignerRole;
  action: SignAction;
  bankid_order_ref: string;
  signature: string;
  ocsp_response: string;
  signed_text: string;
  signer_name: string;
  signer_pnr_encrypted: string;
  signer_pnr_iv: string;
  ip_address: string | null;
  completed_at: string;
}

export interface AuditLogRow {
  id: number;
  session_id: string;
  event_type: AuditEventType;
  actor_role: string | null;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface PendingOrderRow {
  order_ref: string;
  session_id: string;
  signer_role: SignerRole;
  action: SignAction;
  auto_start_token: string;
  qr_start_token: string;
  qr_start_secret: string;
  status: string;
  created_at: string;
}
