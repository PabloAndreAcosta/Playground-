import Database from "better-sqlite3";
import path from "path";

/**
 * SQLite database singleton.
 * Database file: data/concent.db (auto-created).
 * Schema mirrors the Supabase/PostgreSQL migration.
 */

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = path.resolve(process.cwd(), "data", "concent.db");

    // Ensure data directory exists
    const fs = require("fs");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");

    initSchema(_db);
    console.log(`[SQLite] Database ready: ${dbPath}`);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS consent_sessions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending_initiator'
        CHECK (status IN ('pending_initiator', 'pending_partner', 'consented', 'confirmed', 'withdrawn')),
      initiator_name TEXT,
      initiator_pnr_encrypted TEXT,
      initiator_pnr_iv TEXT,
      partner_name TEXT,
      partner_pnr_encrypted TEXT,
      partner_pnr_iv TEXT,
      agreements TEXT NOT NULL DEFAULT '[]',
      before_notes TEXT,
      after_notes TEXT,
      initiator_confirmed_after INTEGER NOT NULL DEFAULT 0,
      partner_confirmed_after INTEGER NOT NULL DEFAULT 0,
      withdrawn_by TEXT,
      share_token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      consent_given_at TEXT,
      confirmation_at TEXT,
      withdrawn_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_share_token ON consent_sessions(share_token);

    CREATE TABLE IF NOT EXISTS bankid_signatures (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES consent_sessions(id) ON DELETE CASCADE,
      signer_role TEXT NOT NULL CHECK (signer_role IN ('initiator', 'partner')),
      action TEXT NOT NULL CHECK (action IN ('consent', 'confirm', 'withdraw')),
      bankid_order_ref TEXT NOT NULL,
      signature TEXT NOT NULL,
      ocsp_response TEXT NOT NULL,
      signed_text TEXT NOT NULL,
      signer_name TEXT NOT NULL,
      signer_pnr_encrypted TEXT NOT NULL,
      signer_pnr_iv TEXT NOT NULL,
      ip_address TEXT,
      completed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_signatures_session ON bankid_signatures(session_id);

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES consent_sessions(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK (event_type IN (
        'session_created', 'partner_joined', 'consent_signed',
        'confirmation_signed', 'consent_withdrawn', 'session_deleted'
      )),
      actor_role TEXT,
      actor_name TEXT,
      metadata TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_log(session_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

    CREATE TABLE IF NOT EXISTS pending_bankid_orders (
      order_ref TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES consent_sessions(id) ON DELETE CASCADE,
      signer_role TEXT NOT NULL CHECK (signer_role IN ('initiator', 'partner')),
      action TEXT NOT NULL CHECK (action IN ('consent', 'confirm', 'withdraw')),
      auto_start_token TEXT NOT NULL,
      qr_start_token TEXT NOT NULL,
      qr_start_secret TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'failed')),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pending_session ON pending_bankid_orders(session_id);
  `);
}
