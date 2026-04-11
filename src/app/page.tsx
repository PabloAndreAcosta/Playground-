"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import type { SessionStatus } from "@/lib/supabase/types";

interface SessionSummary {
  id: string;
  status: SessionStatus;
  initiatorName: string | null;
  partnerName: string | null;
  createdAt: string;
}

export default function Home() {
  const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    fetch("/api/sessions")
      .then((res) => res.json())
      .then((data) => {
        const sessions = (data.sessions ?? []).slice(0, 3).map(
          (s: Record<string, unknown>) => ({
            id: s.id,
            status: s.status,
            initiatorName: s.initiator_name,
            partnerName: s.partner_name,
            createdAt: s.created_at,
          })
        );
        setRecentSessions(sessions);
      })
      .catch(() => {});
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
          Dokumentera ömsesidigt samtycke &mdash; tryggt, juridiskt bindande
          och signerat med BankID.
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
                Ange vad ni samtycker till och signera med BankID.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-sm">2</span>
            </div>
            <div>
              <p className="font-medium">Bjud in din partner</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Skicka en länk. Din partner signerar sitt samtycke med BankID.
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
                Båda signerar att allt gick bra. Juridiskt bindande med BankID.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BankID badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
        <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">B</span>
        </div>
        <span>Signerat och verifierat med BankID</span>
      </div>

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
                    {session.initiatorName ?? "Väntar..."}
                    {session.partnerName
                      ? ` & ${session.partnerName}`
                      : ""}
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
