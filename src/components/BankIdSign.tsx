"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QrCodeDisplay } from "./QrCode";
import { HINT_CODE_MESSAGES } from "@/lib/bankid/types";

interface BankIdSignProps {
  orderRef: string;
  autoStartToken: string;
  qrStartToken: string;
  qrStartSecret: string;
  onComplete: (data: { name: string; givenName: string; surname: string }) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

type Status = "waiting" | "signing" | "complete" | "failed" | "cancelled";

export function BankIdSign({
  orderRef,
  onComplete,
  onError,
  onCancel,
}: BankIdSignProps) {
  const [status, setStatus] = useState<Status>("waiting");
  const [hintMessage, setHintMessage] = useState("Starta BankID-appen");
  const [qrData, setQrData] = useState<string | null>(null);
  const [autoStartToken, setAutoStartToken] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/bankid/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef }),
      });

      if (!res.ok) {
        throw new Error("Poll failed");
      }

      const data = await res.json();

      if (data.status === "complete") {
        setStatus("complete");
        if (intervalRef.current) clearInterval(intervalRef.current);
        onComplete(data.completionData);
        return;
      }

      if (data.status === "failed") {
        setStatus("failed");
        if (intervalRef.current) clearInterval(intervalRef.current);
        const msg =
          HINT_CODE_MESSAGES[data.hintCode ?? ""] ??
          "Något gick fel. Försök igen.";
        setHintMessage(msg);
        onError(msg);
        return;
      }

      // Still pending
      if (data.qrData) {
        setQrData(data.qrData);
      }
      if (data.autoStartToken) {
        setAutoStartToken(data.autoStartToken);
      }

      const hintCode = data.hintCode ?? "outstandingTransaction";
      if (hintCode === "userSign" || hintCode === "userCallConfirm") {
        setStatus("signing");
      }
      setHintMessage(
        HINT_CODE_MESSAGES[hintCode] ?? "Väntar på BankID..."
      );
    } catch {
      // Ignore network errors during polling, will retry
    }
  }, [orderRef, onComplete, onError]);

  useEffect(() => {
    abortRef.current = new AbortController();

    // Start polling every 2 seconds
    poll(); // Initial poll
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortRef.current?.abort();
    };
  }, [poll]);

  async function handleCancel() {
    if (intervalRef.current) clearInterval(intervalRef.current);

    try {
      await fetch("/api/bankid/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderRef }),
      });
    } catch {
      // Ignore cancel errors
    }

    setStatus("cancelled");
    onCancel();
  }

  const isMobile =
    typeof window !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const bankidUrl = autoStartToken
    ? `bankid:///?autostarttoken=${autoStartToken}&redirect=null`
    : null;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        {status === "waiting" && (
          <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
        )}
        {status === "signing" && (
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
        )}
        {status === "complete" && (
          <div className="w-3 h-3 rounded-full bg-green-500" />
        )}
        {status === "failed" && (
          <div className="w-3 h-3 rounded-full bg-red-500" />
        )}
        <p className="text-sm font-medium">{hintMessage}</p>
      </div>

      {/* QR Code (desktop) or Open BankID button (mobile) */}
      {(status === "waiting" || status === "signing") && (
        <>
          {isMobile && bankidUrl ? (
            <a
              href={bankidUrl}
              className="bg-gradient-to-r from-primary to-primary-light text-white font-semibold py-3 px-8 rounded-2xl shadow-md hover:opacity-90 transition-opacity"
            >
              Öppna BankID
            </a>
          ) : (
            qrData && (
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <QrCodeDisplay data={qrData} size={200} />
                <p className="text-xs text-zinc-400 text-center mt-2">
                  Skanna med BankID-appen
                </p>
              </div>
            )
          )}

          <button
            onClick={handleCancel}
            className="text-sm text-zinc-400 hover:text-red-500 transition-colors"
          >
            Avbryt
          </button>
        </>
      )}
    </div>
  );
}
