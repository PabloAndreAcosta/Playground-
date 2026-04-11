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
      <section className="text-center pt-8 pb-2">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
          <span className="text-white font-bold text-3xl">C</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Skydda dig. Skydda varandra.
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
          Concent dokumenterar ömsesidigt samtycke med BankID-signering
          &mdash; före och efter. Som en kondom, fast för trygghet och ansvar.
        </p>
      </section>

      {/* CTA */}
      <section className="flex flex-col gap-3">
        <Link
          href="/ny"
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-light text-white font-semibold py-4 px-6 rounded-2xl shadow-md shadow-purple-200 dark:shadow-purple-900/20 hover:opacity-90 transition-opacity text-lg"
        >
          Nytt samtycke
        </Link>
      </section>

      {/* How it works */}
      <section className="bg-white dark:bg-[#1a1025] rounded-2xl p-6 shadow-sm border border-purple-50 dark:border-purple-900/30">
        <h2 className="font-semibold text-lg mb-4">Så fungerar det</h2>
        <div className="flex flex-col gap-5">
          <Step n={1} title="Innan">
            Ni anger vad ni samtycker till. Båda signerar med BankID.
          </Step>
          <Step n={2} title="3 dagar senare">
            Båda bekräftar att allt gick bra &mdash; i lugn och ro, utan press.
          </Step>
          <Step n={3} title="Alltid">
            Vem som helst kan när som helst återkalla sitt samtycke, signerat
            med BankID som bevis.
          </Step>
        </div>
      </section>

      {/* Why section */}
      <section className="bg-white dark:bg-[#1a1025] rounded-2xl p-6 shadow-sm border border-purple-50 dark:border-purple-900/30">
        <h2 className="font-semibold text-lg mb-3">Varför Concent?</h2>
        <ul className="flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex gap-2">
            <span className="text-primary shrink-0">&#9679;</span>
            <span>
              <strong className="text-foreground">Skydd för alla parter.</strong>{" "}
              Dokumentation som skyddar båda &mdash; inte bara den ena.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0">&#9679;</span>
            <span>
              <strong className="text-foreground">Juridiskt verifierbart.</strong>{" "}
              BankID-signaturer med personnummer, tidstämpel och spårbarhet.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0">&#9679;</span>
            <span>
              <strong className="text-foreground">Betänketid inbyggd.</strong>{" "}
              Efterbekräftelsen sker efter 3 dagar &mdash; utan stress eller
              påtryckningar.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0">&#9679;</span>
            <span>
              <strong className="text-foreground">Kan alltid återkallas.</strong>{" "}
              Samtycke är inte permanent. Återkallande signeras också med BankID.
            </span>
          </li>
        </ul>
      </section>

      {/* BankID trust badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
        <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-[10px]">B</span>
        </div>
        <span>Signerat och verifierat med BankID</span>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Senaste</h2>
            <Link
              href="/historik"
              className="text-sm text-primary hover:underline"
            >
              Visa alla
            </Link>
          </div>
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
                    {session.partnerName ? ` & ${session.partnerName}` : ""}
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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
        <span className="text-primary font-bold text-sm">{n}</span>
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{children}</p>
      </div>
    </div>
  );
}
