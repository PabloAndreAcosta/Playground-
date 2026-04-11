"use client";

import { useState } from "react";

interface ShareLinkProps {
  shareToken: string;
}

export function ShareLink({ shareToken }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL ?? "";

  const url = `${baseUrl}/join/${shareToken}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-100 dark:border-purple-800">
      <p className="text-sm font-medium mb-2">
        Skicka denna länk till din partner:
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={url}
          className="flex-1 rounded-xl border border-purple-200 dark:border-purple-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-mono truncate"
        />
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            copied
              ? "bg-green-500 text-white"
              : "bg-primary text-white hover:opacity-90"
          }`}
        >
          {copied ? "Kopierad!" : "Kopiera"}
        </button>
      </div>
    </div>
  );
}
