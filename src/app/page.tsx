"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSessions } from "@/lib/storage";
import { ConsentSession } from "@/lib/types";

function StatusBadge({ status }: { status: ConsentSession["status"] }) {
  const styles = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    consented:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    confirmed:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    withdrawn:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  const labels = {
    pending: "Inväntar samtycke",
    consented: "Samtycke givet",
    confirmed: "Bekräftad",
    withdrawn: "Återkallat",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function Home() {
  const [recentSessions, setRecentSessions] = useState<ConsentSession[]>([]);

  useEffect(() => {
    setRecentSessions(getSessions().slice(0, 3));
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="text-center pt-8 pb-4">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
          <span className="text-white font-bold text-3xl">C</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Concent</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
          Dokumentera ömsesidigt samtycke &mdash; tryggt, tydligt och
          respektfullt.
        </p>
      </section>

      {/* Actions */}
      <section className="flex flex-col gap-3">
        <Link
          href="/ny"
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-light text-white font-semibold py-4 px-6 rounded-2xl shadow-md shadow-purple-200 dark:shadow-purple-900/20 hover:opacity-90 transition-opacity text-lg"
        >
          Nytt samtycke
        </Link>
        <Link
          href="/historik"
          className="flex items-center justify-center gap-2 border-2 border-purple-200 dark:border-purple-800 text-primary-light font-medium py-3 px-6 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
        >
          Visa historik
        </Link>
      </section>

      {/* How it works */}
      <section className="bg-white dark:bg-[#1a1025] rounded-2xl p-6 shadow-sm border border-purple-50 dark:border-purple-900/30">
        <h2 className="font-semibold text-lg mb-4">Så fungerar det</h2>
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-sm">1</span>
            </div>
            <div>
              <p className="font-medium">Skapa en session</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Ange båda parters namn och vad ni samtycker till.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-sm">2</span>
            </div>
            <div>
              <p className="font-medium">Ge samtycke</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Båda parter bekräftar sitt samtycke innan.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-sm">3</span>
            </div>
            <div>
              <p className="font-medium">Bekräfta efteråt</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Båda bekräftar att allt gick bra och kändes rätt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-3">Senaste sessioner</h2>
          <div className="flex flex-col gap-2">
            {recentSessions.map((session) => (
              <Link
                key={session.id}
                href={`/session/${session.id}`}
                className="bg-white dark:bg-[#1a1025] rounded-xl p-4 border border-purple-50 dark:border-purple-900/30 hover:border-purple-200 dark:hover:border-purple-700 transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-sm">
                    {session.initiatorName} &amp; {session.partnerName}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(session.createdAt).toLocaleDateString("sv-SE")}
                  </p>
                </div>
                <StatusBadge status={session.status} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
