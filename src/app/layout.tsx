import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Concent - Dokumenterat samtycke",
  description:
    "Concent hjälper dig att dokumentera ömsesidigt samtycke på ett tryggt och respektfullt sätt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {process.env.BANKID_MOCK === "true" && (
          <div className="bg-orange-500 text-white text-center text-xs py-1 font-medium">
            TESTL&Auml;GE &mdash; Ingen riktig BankID-verifiering
          </div>
        )}
        <header className="border-b border-purple-100 dark:border-purple-900/30 bg-white/80 dark:bg-[#1a1025]/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-semibold text-lg tracking-tight">
                Concent
              </span>
            </a>
            <a
              href="/historik"
              className="text-sm text-purple-600 dark:text-purple-400 hover:underline"
            >
              Historik
            </a>
          </div>
        </header>
        <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-purple-100 dark:border-purple-900/30 py-4 text-center text-xs text-zinc-400">
          <div className="flex items-center justify-center gap-2">
            <span>Concent &mdash; Trygghet genom transparens</span>
            <span>&middot;</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-blue-600 text-white font-bold text-[8px] leading-4 text-center">
                B
              </span>
              Secured by BankID
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
