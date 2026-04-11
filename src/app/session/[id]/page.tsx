"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BankIdSign } from "@/components/BankIdSign";
import { StatusBadge } from "@/components/StatusBadge";
import { ShareLink } from "@/components/ShareLink";
import type { SessionStatus, SignerRole, SignAction } from "@/lib/supabase/types";

interface SessionData {
  id: string;
  status: SessionStatus;
  initiatorName: string | null;
  partnerName: string | null;
  agreements: string[];
  beforeNotes: string | null;
  afterNotes: string | null;
  initiatorConfirmedAfter: boolean;
  partnerConfirmedAfter: boolean;
  withdrawnBy: string | null;
  shareToken: string;
  createdAt: string;
  consentGivenAt: string | null;
  confirmationAt: string | null;
  withdrawnAt: string | null;
}

interface SignatureData {
  id: string;
  signerRole: string;
  action: string;
  signerName: string;
  completedAt: string;
}

interface AuditEntry {
  id: number;
  event_type: string;
  actor_role: string | null;
  actor_name: string | null;
  created_at: string;
}

interface BankIdOrder {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankIdOrder, setBankIdOrder] = useState<BankIdOrder | null>(null);
  const [signingAction, setSigningAction] = useState<{
    role: SignerRole;
    action: SignAction;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${params.id}`);
      if (!res.ok) throw new Error("Session hittades inte");
      const data = await res.json();
      setSession(data.session);
      setSignatures(data.signatures);
      setAuditLog(data.auditLog);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  async function startBankIdSign(role: SignerRole, action: SignAction) {
    setError(null);
    try {
      const res = await fetch("/api/bankid/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: params.id, role, action }),
      });

      if (!res.ok) throw new Error("Kunde inte starta BankID");
      const data = await res.json();

      setBankIdOrder({
        orderRef: data.orderRef,
        autoStartToken: data.autoStartToken,
        qrStartToken: data.qrStartToken,
        qrStartSecret: data.qrStartSecret,
      });
      setSigningAction({ role, action });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-zinc-400">Session hittades inte.</p>
        <button
          onClick={() => router.push("/")}
          className="text-primary hover:underline text-sm"
        >
          Tillbaka till start
        </button>
      </div>
    );
  }

  // If BankID signing is in progress
  if (bankIdOrder && signingAction) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <button
            onClick={() => {
              setBankIdOrder(null);
              setSigningAction(null);
            }}
            className="text-sm text-primary hover:underline mb-2 inline-block"
          >
            &larr; Tillbaka
          </button>
          <h1 className="text-2xl font-bold tracking-tight">
            Signera med BankID
          </h1>
        </div>

        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30">
          <BankIdSign
            orderRef={bankIdOrder.orderRef}
            autoStartToken={bankIdOrder.autoStartToken}
            qrStartToken={bankIdOrder.qrStartToken}
            qrStartSecret={bankIdOrder.qrStartSecret}
            onComplete={() => {
              setBankIdOrder(null);
              setSigningAction(null);
              fetchSession();
            }}
            onError={(msg) => setError(msg)}
            onCancel={() => {
              setBankIdOrder(null);
              setSigningAction(null);
            }}
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-primary hover:underline mb-2 inline-block"
        >
          &larr; Tillbaka
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {session.initiatorName ?? "Väntar..."}
            {session.partnerName ? ` & ${session.partnerName}` : ""}
          </h1>
          <StatusBadge status={session.status} />
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Skapad{" "}
          {new Date(session.createdAt).toLocaleString("sv-SE", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Share link when waiting for partner */}
      {session.status === "pending_partner" && (
        <ShareLink shareToken={session.shareToken} />
      )}

      {/* Agreements */}
      <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30">
        <h2 className="font-semibold mb-3">Överenskommelser</h2>
        <div className="flex flex-col gap-2">
          {session.agreements.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2"
            >
              <span className="text-primary text-sm mt-0.5">&#10003;</span>
              <span className="text-sm">{a}</span>
            </div>
          ))}
        </div>
        {session.beforeNotes && (
          <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-900/30">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Anteckningar
            </p>
            <p className="text-sm">{session.beforeNotes}</p>
          </div>
        )}
      </div>

      {/* Signatures */}
      {signatures.length > 0 && (
        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30">
          <h2 className="font-semibold mb-3">BankID-signaturer</h2>
          <div className="flex flex-col gap-2">
            {signatures.map((sig) => (
              <div
                key={sig.id}
                className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2"
              >
                <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-[10px]">B</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{sig.signerName}</p>
                  <p className="text-xs text-zinc-400">
                    {sig.action === "consent" && "Samtycke signerat"}
                    {sig.action === "confirm" && "Bekräftelse signerad"}
                    {sig.action === "withdraw" && "Återkallande signerat"}
                    {" "}
                    &middot;{" "}
                    {new Date(sig.completedAt).toLocaleString("sv-SE")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions based on status */}
      {session.status === "consented" && (
        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30 flex flex-col gap-4">
          <h2 className="font-semibold">Bekräfta efteråt</h2>
          <p className="text-sm text-zinc-500">
            Bekräfta med BankID att allt gick bra.
          </p>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 rounded-xl px-4 py-3">
              <span className="text-sm font-medium">
                {session.initiatorName}
              </span>
              {session.initiatorConfirmedAfter ? (
                <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-[8px]">B</span>
                  </div>
                  Bekräftad
                </span>
              ) : (
                <button
                  onClick={() => startBankIdSign("initiator", "confirm")}
                  className="bg-success text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Bekräfta med BankID
                </button>
              )}
            </div>
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 rounded-xl px-4 py-3">
              <span className="text-sm font-medium">
                {session.partnerName}
              </span>
              {session.partnerConfirmedAfter ? (
                <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-[8px]">B</span>
                  </div>
                  Bekräftad
                </span>
              ) : (
                <button
                  onClick={() => startBankIdSign("partner", "confirm")}
                  className="bg-success text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Bekräfta med BankID
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => startBankIdSign("initiator", "withdraw")}
            className="text-red-500 text-sm hover:underline self-start"
          >
            Återkalla samtycke med BankID
          </button>
        </div>
      )}

      {session.status === "confirmed" && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 border border-green-200 dark:border-green-800 text-center">
          <div className="text-4xl mb-2">&#10003;</div>
          <p className="font-semibold text-green-800 dark:text-green-200">
            Allt bekräftat med BankID
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Båda parter har signerat med BankID att allt gick bra.
          </p>
          {session.confirmationAt && (
            <p className="text-xs text-green-500 mt-2">
              Bekräftad{" "}
              {new Date(session.confirmationAt).toLocaleString("sv-SE", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
      )}

      {session.status === "withdrawn" && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-200 dark:border-red-800 text-center">
          <p className="font-semibold text-red-800 dark:text-red-200">
            Samtycke har återkallats
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            Återkallat av {session.withdrawnBy}{" "}
            {session.withdrawnAt &&
              new Date(session.withdrawnAt).toLocaleString("sv-SE", {
                dateStyle: "long",
                timeStyle: "short",
              })}
          </p>
        </div>
      )}

      {/* Pending partner status */}
      {session.status === "pending_partner" && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-5 border border-orange-200 dark:border-orange-800 text-center">
          <p className="font-semibold text-orange-800 dark:text-orange-200">
            Inväntar partner
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
            Skicka länken ovan till din partner för att de ska kunna signera
            sitt samtycke med BankID.
          </p>
        </div>
      )}

      {/* Timeline / Audit log */}
      {auditLog.length > 0 && (
        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30">
          <h2 className="font-semibold mb-3">Händelselogg</h2>
          <div className="flex flex-col gap-3">
            {auditLog.map((entry) => (
              <div key={entry.id} className="flex gap-3 items-start">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {formatEventType(entry.event_type)}
                    {entry.actor_name && (
                      <span className="text-zinc-400 font-normal">
                        {" "}
                        &middot; {entry.actor_name}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(entry.created_at).toLocaleString("sv-SE")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatEventType(type: string): string {
  const map: Record<string, string> = {
    session_created: "Session skapad",
    partner_joined: "Partner anslöt",
    consent_signed: "Samtycke signerat med BankID",
    confirmation_signed: "Bekräftelse signerad med BankID",
    consent_withdrawn: "Samtycke återkallat med BankID",
    session_deleted: "Session borttagen",
  };
  return map[type] ?? type;
}
