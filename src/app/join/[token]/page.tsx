"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BankIdSign } from "@/components/BankIdSign";

interface InviteData {
  sessionId: string;
  initiatorName: string;
  agreements: string[];
  beforeNotes: string | null;
  createdAt: string;
}

interface BankIdOrder {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
}

type Phase = "loading" | "preview" | "signing" | "done" | "error";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [bankIdOrder, setBankIdOrder] = useState<BankIdOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInvite = useCallback(async () => {
    try {
      const res = await fetch(`/api/invite/${params.token}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Inbjudan hittades inte");
        setPhase("error");
        return;
      }
      const data = await res.json();
      setInvite(data);
      setPhase("preview");
    } catch {
      setError("Kunde inte ladda inbjudan");
      setPhase("error");
    }
  }, [params.token]);

  useEffect(() => {
    fetchInvite();
  }, [fetchInvite]);

  async function handleSign() {
    if (!invite) return;
    setError(null);

    try {
      const res = await fetch("/api/bankid/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: invite.sessionId,
          role: "partner",
          action: "consent",
        }),
      });

      if (!res.ok) throw new Error("Kunde inte starta BankID");
      const data = await res.json();

      setBankIdOrder({
        orderRef: data.orderRef,
        autoStartToken: data.autoStartToken,
        qrStartToken: data.qrStartToken,
        qrStartSecret: data.qrStartSecret,
      });
      setPhase("signing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="text-primary hover:underline text-sm"
        >
          Tillbaka till start
        </button>
      </div>
    );
  }

  if (phase === "signing" && bankIdOrder && invite) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Signera ditt samtycke
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Öppna BankID-appen och signera.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30">
          <BankIdSign
            orderRef={bankIdOrder.orderRef}
            autoStartToken={bankIdOrder.autoStartToken}
            qrStartToken={bankIdOrder.qrStartToken}
            qrStartSecret={bankIdOrder.qrStartSecret}
            onComplete={() => {
              setPhase("done");
              router.push(`/session/${invite.sessionId}`);
            }}
            onError={(msg) => setError(msg)}
            onCancel={() => {
              setPhase("preview");
              setBankIdOrder(null);
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

  if (phase === "preview" && invite) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Samtyckesförfrågan
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {invite.initiatorName} vill dokumentera ömsesidigt samtycke med dig.
          </p>
        </div>

        {/* Agreements */}
        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30 flex flex-col gap-3">
          <h2 className="font-semibold">Överenskommelser</h2>
          <p className="text-xs text-zinc-400">
            Genom att signera godkänner du dessa punkter:
          </p>
          <div className="flex flex-col gap-2">
            {invite.agreements.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2"
              >
                <span className="text-primary text-sm mt-0.5">&#10003;</span>
                <span className="text-sm">{a}</span>
              </div>
            ))}
          </div>
          {invite.beforeNotes && (
            <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-900/30">
              <p className="text-xs font-medium text-zinc-500 mb-1">
                Anteckningar
              </p>
              <p className="text-sm">{invite.beforeNotes}</p>
            </div>
          )}
        </div>

        <div className="text-xs text-zinc-400 text-center">
          Skapad{" "}
          {new Date(invite.createdAt).toLocaleString("sv-SE", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </div>

        <button
          onClick={handleSign}
          className="bg-gradient-to-r from-primary to-primary-light text-white font-semibold py-4 px-6 rounded-2xl shadow-md shadow-purple-200 dark:shadow-purple-900/20 hover:opacity-90 transition-opacity text-lg flex items-center justify-center gap-2"
        >
          <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">B</span>
          </div>
          Signera med BankID
        </button>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
}
