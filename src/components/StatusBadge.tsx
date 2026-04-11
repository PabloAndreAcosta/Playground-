import type { SessionStatus } from "@/lib/supabase/types";

const styles: Record<SessionStatus, string> = {
  pending_initiator:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  pending_partner:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  consented:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  confirmed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  withdrawn:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const labels: Record<SessionStatus, string> = {
  pending_initiator: "Inväntar signering",
  pending_partner: "Inväntar partner",
  consented: "Samtycke givet",
  confirmed: "Bekräftad",
  withdrawn: "Återkallat",
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? ""}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
