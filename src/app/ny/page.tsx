"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "@/lib/storage";
import { ConsentSession } from "@/lib/types";

const DEFAULT_AGREEMENTS = [
  "Vi deltar frivilligt och utan påtryckningar",
  "Vi respekterar varandras gränser",
  "Vem som helst kan när som helst säga stopp",
  "Vi har diskuterat våra önskemål och gränser",
];

export default function NySession() {
  const router = useRouter();
  const [initiatorName, setInitiatorName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [agreements, setAgreements] = useState<string[]>([
    ...DEFAULT_AGREEMENTS,
  ]);
  const [customAgreement, setCustomAgreement] = useState("");
  const [notes, setNotes] = useState("");

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!initiatorName.trim() || !partnerName.trim()) return;

    const session: ConsentSession = {
      id: crypto.randomUUID(),
      initiatorName: initiatorName.trim(),
      partnerName: partnerName.trim(),
      createdAt: new Date().toISOString(),
      status: "pending",
      initiatorAgreements: [...agreements],
      partnerAgreements: [],
      beforeNotes: notes.trim() || undefined,
    };

    saveSession(session);
    router.push(`/session/${session.id}`);
  }

  const isValid = initiatorName.trim() && partnerName.trim() && agreements.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nytt samtycke</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Skapa en ny samtyckessession mellan två parter.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Names */}
        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30 flex flex-col gap-4">
          <h2 className="font-semibold">Deltagare</h2>
          <div>
            <label
              htmlFor="initiator"
              className="block text-sm font-medium mb-1"
            >
              Ditt namn
            </label>
            <input
              id="initiator"
              type="text"
              value={initiatorName}
              onChange={(e) => setInitiatorName(e.target.value)}
              placeholder="Ditt namn"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div>
            <label
              htmlFor="partner"
              className="block text-sm font-medium mb-1"
            >
              Partnerns namn
            </label>
            <input
              id="partner"
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Partnerns namn"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
        </div>

        {/* Agreements */}
        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30 flex flex-col gap-3">
          <h2 className="font-semibold">Överenskommelser</h2>
          <p className="text-xs text-zinc-400">
            Dessa punkter bekräftar ni båda innan.
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
            placeholder="Eventuella anteckningar eller detaljer..."
            rows={3}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid}
          className="bg-gradient-to-r from-primary to-primary-light text-white font-semibold py-4 px-6 rounded-2xl shadow-md shadow-purple-200 dark:shadow-purple-900/20 hover:opacity-90 transition-opacity text-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Skapa session
        </button>
      </form>
    </div>
  );
}
