"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import type { SessionStatus } from "@/lib/supabase/types";

interface SessionItem {
  id: string;
  status: SessionStatus;
  initiatorName: string | null;
  partnerName: string | null;
  createdAt: string;
}

export default function Historik() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [filter, setFilter] = useState<SessionStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sessions")
      .then((res) => res.json())
      .then((data) => {
        const items = (data.sessions ?? []).map(
          (s: Record<string, unknown>) => ({
            id: s.id,
            status: s.status,
            initiatorName: s.initiator_name,
            partnerName: s.partner_name,
            createdAt: s.created_at,
          })
        );
        setSessions(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? sessions : sessions.filter((s) => s.status === filter);

  async function handleDelete(id: string) {
    if (!confirm("Är du säker på att du vill ta bort denna session?")) return;

    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions(sessions.filter((s) => s.id !== id));
    } catch {
      // Ignore
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historik</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Alla dina samtyckessessioner.
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["all", "Alla"],
            ["pending_initiator", "Startar"],
            ["pending_partner", "Inväntar"],
            ["consented", "Samtyckt"],
            ["confirmed", "Bekräftade"],
            ["withdrawn", "Återkallade"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
              filter === value
                ? "bg-primary text-white border-primary"
                : "border-zinc-200 dark:border-zinc-700 hover:border-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-400">Inga sessioner att visa.</p>
          <Link
            href="/ny"
            className="text-primary hover:underline text-sm mt-2 inline-block"
          >
            Skapa din första session
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-[#1a1025] rounded-xl border border-purple-50 dark:border-purple-900/30 hover:border-purple-200 dark:hover:border-purple-700 transition-colors"
            >
              <Link
                href={`/session/${session.id}`}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-sm">
                    {session.initiatorName ?? "Väntar..."}
                    {session.partnerName
                      ? ` & ${session.partnerName}`
                      : ""}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {new Date(session.createdAt).toLocaleString("sv-SE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <StatusBadge status={session.status} />
              </Link>
              <div className="px-4 pb-3 pt-0">
                <button
                  onClick={() => handleDelete(session.id)}
                  className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                >
                  Ta bort
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
