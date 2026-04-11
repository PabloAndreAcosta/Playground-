"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BankIdSign } from "@/components/BankIdSign";

const DEFAULT_AGREEMENTS = [
  "Vi deltar frivilligt och utan påtryckningar",
  "Vi respekterar varandras gränser",
  "Vem som helst kan när som helst säga stopp",
  "Vi har diskuterat våra önskemål och gränser",
];

type Phase = "form" | "signing" | "done";

interface BankIdOrder {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
  sessionId: string;
}

export default function NySession() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("form");
  const [agreements, setAgreements] = useState<string[]>([
    ...DEFAULT_AGREEMENTS,
  ]);
  const [customAgreement, setCustomAgreement] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bankIdOrder, setBankIdOrder] = useState<BankIdOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addCustomAgreement() {
    const trimmed = customAgreement.trim();
    if (trimmed && !agreements.includes(trimmed)) {
      setAgreements([...agreements, trimmed]);
      setCustomAgreement("");
    }
  }

  function removeAgreement(index: number) {
    setAgreements(agreements.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (agreements.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreements,
          beforeNotes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Något gick fel");
      }

      const data = await res.json();
      setBankIdOrder({
        orderRef: data.orderRef,
        autoStartToken: data.autoStartToken,
        qrStartToken: data.qrStartToken,
        qrStartSecret: data.qrStartSecret,
        sessionId: data.sessionId,
      });
      setPhase("signing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (phase === "signing" && bankIdOrder) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Signera med BankID
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Öppna BankID-appen och signera ditt samtycke.
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
              router.push(`/session/${bankIdOrder.sessionId}`);
            }}
            onError={(msg) => setError(msg)}
            onCancel={() => {
              setPhase("form");
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nytt samtycke</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Välj överenskommelser och signera med BankID.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Agreements */}
        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30 flex flex-col gap-3">
          <h2 className="font-semibold">Överenskommelser</h2>
          <p className="text-xs text-zinc-400">
            Dessa punkter signeras av båda parter med BankID.
          </p>
          <div className="flex flex-col gap-2">
            {agreements.map((agreement, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2"
              >
                <span className="text-primary text-sm">&#10003;</span>
                <span className="text-sm flex-1">{agreement}</span>
                <button
                  type="button"
                  onClick={() => removeAgreement(index)}
                  className="text-zinc-400 hover:text-red-500 text-sm"
                >
                  &#10005;
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customAgreement}
              onChange={(e) => setCustomAgreement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomAgreement();
                }
              }}
              placeholder="Lägg till egen punkt..."
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="button"
              onClick={addCustomAgreement}
              className="bg-primary text-white rounded-xl px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              +
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30 flex flex-col gap-3">
          <h2 className="font-semibold">Anteckningar (valfritt)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Eventuella anteckningar..."
            rows={3}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={agreements.length === 0 || isSubmitting}
          className="bg-gradient-to-r from-primary to-primary-light text-white font-semibold py-4 px-6 rounded-2xl shadow-md shadow-purple-200 dark:shadow-purple-900/20 hover:opacity-90 transition-opacity text-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            "Skapar session..."
          ) : (
            <>
              <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">B</span>
              </div>
              Skapa och signera med BankID
            </>
          )}
        </button>
      </form>
    </div>
  );
}
