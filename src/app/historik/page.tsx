"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSessions, deleteSession } from "@/lib/storage";
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
    pending: "Inväntar",
    consented: "Samtyckt",
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

export default function Historik() {
  const [sessions, setSessions] = useState<ConsentSession[]>([]);
  const [filter, setFilter] = useState<ConsentSession["status"] | "all">(
    "all"
  );

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const filtered =
    filter === "all" ? sessions : sessions.filter((s) => s.status === filter);

  function handleDelete(id: string) {
    if (confirm("Är du säker på att du vill ta bort denna session?")) {
      deleteSession(id);
      setSessions(getSessions());
    }
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
            ["pending", "Pågående"],
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
                    {session.initiatorName} &amp; {session.partnerName}
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
