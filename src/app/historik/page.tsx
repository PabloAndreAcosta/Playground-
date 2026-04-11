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
        <button
          onClick={() => window.history.back()}
          className="text-sm text-primary hover:underline mb-2 inline-block"
        >
          &larr; Tillbaka
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Historik</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {sessions.length === 0
            ? "Inga sessioner ännu."
            : `${sessions.length} session${sessions.length === 1 ? "" : "er"} totalt.`}
        </p>
      </div>

      {/* Filter */}
      {sessions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(
            [
              ["all", "Alla"],
              ["pending_partner", "Inväntar"],
              ["consented", "Samtyckt"],
              ["confirmed", "Bekräftade"],
              ["withdrawn", "Återkallade"],
            ] as const
          ).map(([value, label]) => {
            const count =
              value === "all"
                ? sessions.length
                : sessions.filter((s) => s.status === value).length;
            if (value !== "all" && count === 0) return null;
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  filter === value
                    ? "bg-primary text-white border-primary"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-primary"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Sessions list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <span className="text-3xl text-purple-300">C</span>
          </div>
          <p className="text-zinc-400 mb-3">
            {sessions.length === 0
              ? "Inga sessioner ännu."
              : "Inga sessioner matchar filtret."}
          </p>
          {sessions.length === 0 && (
            <Link
              href="/ny"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-light text-white font-medium py-2.5 px-5 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              Skapa din första session
            </Link>
          )}
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
                    {session.partnerName ? ` & ${session.partnerName}` : ""}
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
              <div className="px-4 pb-3 pt-0 border-t border-zinc-50 dark:border-zinc-900">
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
