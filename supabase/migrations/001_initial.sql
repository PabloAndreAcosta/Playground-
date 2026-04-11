-- Concent: Consent tracking with BankID signatures
-- Migration 001: Initial schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Consent sessions
create table consent_sessions (
  id uuid primary key default uuid_generate_v4(),
  status text not null default 'pending_initiator'
    check (status in ('pending_initiator', 'pending_partner', 'consented', 'confirmed', 'withdrawn')),
  initiator_name text,
  initiator_pnr_encrypted text,
  initiator_pnr_iv text,
  partner_name text,
  partner_pnr_encrypted text,
  partner_pnr_iv text,
  agreements jsonb not null default '[]'::jsonb,
  before_notes text,
  after_notes text,
  initiator_confirmed_after boolean not null default false,
  partner_confirmed_after boolean not null default false,
  withdrawn_by text,
  share_token text unique not null,
  created_at timestamptz not null default now(),
  consent_given_at timestamptz,
  confirmation_at timestamptz,
  withdrawn_at timestamptz
);

-- Index for share token lookups
create index idx_consent_sessions_share_token on consent_sessions(share_token);

-- BankID signatures
create table bankid_signatures (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references consent_sessions(id) on delete cascade,
  signer_role text not null check (signer_role in ('initiator', 'partner')),
  action text not null check (action in ('consent', 'confirm', 'withdraw')),
  bankid_order_ref text not null,
  signature text not null,
  ocsp_response text not null,
  signed_text text not null,
  signer_name text not null,
  signer_pnr_encrypted text not null,
  signer_pnr_iv text not null,
  ip_address text,
  completed_at timestamptz not null default now()
);

create index idx_bankid_signatures_session on bankid_signatures(session_id);

-- Audit log (append-only)
create table audit_log (
  id bigserial primary key,
  session_id uuid not null references consent_sessions(id) on delete cascade,
  event_type text not null check (event_type in (
    'session_created', 'partner_joined', 'consent_signed',
    'confirmation_signed', 'consent_withdrawn', 'session_deleted'
  )),
  actor_role text,
  actor_name text,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_audit_log_session on audit_log(session_id);
create index idx_audit_log_created on audit_log(created_at);

-- Pending BankID orders (in-flight operations)
create table pending_bankid_orders (
  order_ref text primary key,
  session_id uuid not null references consent_sessions(id) on delete cascade,
  signer_role text not null check (signer_role in ('initiator', 'partner')),
  action text not null check (action in ('consent', 'confirm', 'withdraw')),
  auto_start_token text not null,
  qr_start_token text not null,
  qr_start_secret text not null,
  status text not null default 'pending' check (status in ('pending', 'complete', 'failed')),
  created_at timestamptz not null default now()
);

create index idx_pending_orders_session on pending_bankid_orders(session_id);

-- Row Level Security (RLS)
-- For now, API routes use the service_role key so RLS is bypassed.
-- When adding client-side Supabase access, enable RLS and add policies.
alter table consent_sessions enable row level security;
alter table bankid_signatures enable row level security;
alter table audit_log enable row level security;
alter table pending_bankid_orders enable row level security;

-- Service role can do everything (used by API routes)
create policy "Service role full access" on consent_sessions for all using (true);
create policy "Service role full access" on bankid_signatures for all using (true);
create policy "Service role full access" on audit_log for all using (true);
create policy "Service role full access" on pending_bankid_orders for all using (true);
