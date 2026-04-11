"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession, saveSession } from "@/lib/storage";
import { ConsentSession } from "@/lib/types";

function StatusBanner({ session }: { session: ConsentSession }) {
  const banners = {
    pending: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-800 dark:text-yellow-200",
      label: "Inväntar samtycke",
      desc: "Båda parter behöver ge sitt samtycke.",
    },
    consented: {
      bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
      text: "text-blue-800 dark:text-blue-200",
      label: "Samtycke givet",
      desc: "Samtycke har getts. Bekräfta efteråt att allt gick bra.",
    },
    confirmed: {
      bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
      text: "text-green-800 dark:text-green-200",
      label: "Bekräftad",
      desc: "Båda parter har bekräftat att allt gick bra.",
    },
    withdrawn: {
      bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
      text: "text-red-800 dark:text-red-200",
      label: "Samtycke återkallat",
      desc: `Samtycke återkallades av ${session.withdrawnBy || "en part"}.`,
    },
  };
  const b = banners[session.status];
  return (
    <div className={`rounded-2xl p-4 border ${b.bg}`}>
      <p className={`font-semibold ${b.text}`}>{b.label}</p>
      <p className={`text-sm mt-1 ${b.text} opacity-80`}>{b.desc}</p>
    </div>
  );
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<ConsentSession | null>(null);
  const [afterNotes, setAfterNotes] = useState("");

  useEffect(() => {
    const s = getSession(params.id as string);
    if (s) {
      setSession(s);
    }
  }, [params.id]);

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

  function giveConsent() {
    if (!session) return;
    const updated: ConsentSession = {
      ...session,
      status: "consented",
      consentGivenAt: new Date().toISOString(),
      partnerAgreements: [...session.initiatorAgreements],
    };
    saveSession(updated);
    setSession(updated);
  }

  function confirmAfter(who: "initiator" | "partner") {
    if (!session) return;
    const updated: ConsentSession = { ...session };
    if (who === "initiator") {
      updated.initiatorConfirmedAfter = true;
    } else {
      updated.partnerConfirmedAfter = true;
    }
    if (updated.initiatorConfirmedAfter && updated.partnerConfirmedAfter) {
      updated.status = "confirmed";
      updated.confirmationAt = new Date().toISOString();
      updated.afterNotes = afterNotes.trim() || undefined;
    }
    saveSession(updated);
    setSession(updated);
  }

  function withdrawConsent(who: string) {
    if (!session) return;
    const updated: ConsentSession = {
      ...session,
      status: "withdrawn",
      withdrawnBy: who,
      withdrawnAt: new Date().toISOString(),
    };
    saveSession(updated);
    setSession(updated);
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
        <h1 className="text-2xl font-bold tracking-tight">
          {session.initiatorName} &amp; {session.partnerName}
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Skapad{" "}
          {new Date(session.createdAt).toLocaleString("sv-SE", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </p>
      </div>

      <StatusBanner session={session} />

      {/* Agreements */}
      <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30">
        <h2 className="font-semibold mb-3">Överenskommelser</h2>
        <div className="flex flex-col gap-2">
          {session.initiatorAgreements.map((a, i) => (
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

      {/* Actions based on status */}
      {session.status === "pending" && (
        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30 flex flex-col gap-4">
          <h2 className="font-semibold">Ge samtycke</h2>
          <p className="text-sm text-zinc-500">
            Genom att trycka nedan bekräftar båda parter att de har läst och
            godkänner överenskommelserna ovan och deltar frivilligt.
          </p>
          <button
            onClick={giveConsent}
            className="bg-gradient-to-r from-primary to-primary-light text-white font-semibold py-4 px-6 rounded-2xl shadow-md hover:opacity-90 transition-opacity"
          >
            Vi samtycker båda
          </button>
          <button
            onClick={() =>
              withdrawConsent(session.initiatorName)
            }
            className="text-red-500 text-sm hover:underline"
          >
            Avbryt session
          </button>
        </div>
      )}

      {session.status === "consented" && (
        <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30 flex flex-col gap-4">
          <h2 className="font-semibold">Bekräfta efteråt</h2>
          <p className="text-sm text-zinc-500">
            Bekräfta att allt gick bra och att ni båda känner er nöjda.
          </p>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 rounded-xl px-4 py-3">
              <span className="text-sm font-medium">
                {session.initiatorName}
              </span>
              {session.initiatorConfirmedAfter ? (
                <span className="text-green-600 text-sm font-medium">
                  &#10003; Bekräftad
                </span>
              ) : (
                <button
                  onClick={() => confirmAfter("initiator")}
                  className="bg-success text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Bekräfta
                </button>
              )}
            </div>
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 rounded-xl px-4 py-3">
              <span className="text-sm font-medium">
                {session.partnerName}
              </span>
              {session.partnerConfirmedAfter ? (
                <span className="text-green-600 text-sm font-medium">
                  &#10003; Bekräftad
                </span>
              ) : (
                <button
                  onClick={() => confirmAfter("partner")}
                  className="bg-success text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Bekräfta
                </button>
              )}
            </div>
          </div>

          <textarea
            value={afterNotes}
            onChange={(e) => setAfterNotes(e.target.value)}
            placeholder="Anteckningar efteråt (valfritt)..."
            rows={2}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <button
            onClick={() =>
              withdrawConsent(session.initiatorName)
            }
            className="text-red-500 text-sm hover:underline self-start"
          >
            Återkalla samtycke
          </button>
        </div>
      )}

      {session.status === "confirmed" && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 border border-green-200 dark:border-green-800 text-center">
          <div className="text-4xl mb-2">&#10003;</div>
          <p className="font-semibold text-green-800 dark:text-green-200">
            Allt bekräftat
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Båda parter har bekräftat att allt gick bra.
          </p>
          {session.afterNotes && (
            <p className="text-sm mt-3 text-green-600 dark:text-green-400 italic">
              &ldquo;{session.afterNotes}&rdquo;
            </p>
          )}
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

      {/* Timeline */}
      <div className="bg-white dark:bg-[#1a1025] rounded-2xl p-5 border border-purple-50 dark:border-purple-900/30">
        <h2 className="font-semibold mb-3">Tidslinje</h2>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 items-start">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Session skapad</p>
              <p className="text-xs text-zinc-400">
                {new Date(session.createdAt).toLocaleString("sv-SE")}
              </p>
            </div>
          </div>
          {session.consentGivenAt && (
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Samtycke givet</p>
                <p className="text-xs text-zinc-400">
                  {new Date(session.consentGivenAt).toLocaleString("sv-SE")}
                </p>
              </div>
            </div>
          )}
          {session.confirmationAt && (
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Bekräftad av båda</p>
                <p className="text-xs text-zinc-400">
                  {new Date(session.confirmationAt).toLocaleString("sv-SE")}
                </p>
              </div>
            </div>
          )}
          {session.withdrawnAt && (
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  Återkallat av {session.withdrawnBy}
                </p>
                <p className="text-xs text-zinc-400">
                  {new Date(session.withdrawnAt).toLocaleString("sv-SE")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
