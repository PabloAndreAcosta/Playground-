<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation
notices.
<!-- END:nextjs-agent-rules -->

# Concent — brief for the next agent

You are picking up a Swedish-language app called **Concent** that documents
mutual sexual consent with BankID signatures. Read this file fully before
making product decisions — several features that *look* obvious are
deliberately excluded, and several that look redundant are load-bearing.

## Product in one paragraph

Two people agree on what they consent to, both sign with BankID, then three
days later both must confirm that it actually went well. Withdrawal is
possible at any time and is itself BankID-signed. Positioning is **protective,
not contractual** — the kondom-analogy ("som en kondom, fast för trygghet och
ansvar") is the marketing spine.

## Non-obvious design decisions

These are the ones most likely to be "improved" incorrectly. Don't.

### The 3-day confirmation delay is the whole point
`src/app/session/[id]/page.tsx` enforces
`CONFIRMATION_DELAY_MS = 3 * 24 * 60 * 60 * 1000`. This is the mechanism that
prevents the app from becoming *"förövarens verktyg"* — a perpetrator cannot
coerce a confirmation in the moment because the button is locked for 72
hours. Do not shorten, hide, or add a skip-the-wait path.

### Protective framing, not contractual
Copy everywhere uses words like *skydd*, *trygghet*, *dokumenterar*. Never
*avtal*, *kontrakt*, *bindande*. The UX must feel like a safety tool. Avoid
legalese in user-facing copy even when the backend is producing legal
evidence.

### Niche: sexual consent only
Resist requests to generalize into universal consent, event attendance,
medical procedures, etc. The value proposition and regulatory model only work
for this narrow scope. Generalizing dilutes RFSU-style partnership pitches
and broadens GDPR Art. 9 exposure unnecessarily.

### No emergency button / överfallslarm
Explicitly rejected. Reasons: duplicates 112 and SOS-alarm apps, legal
liability if it fails, false positives undermine credibility, undermines the
"trygghet"-framing by introducing panic UX, and web notification/call APIs
are not reliable enough to stake safety on.

### BankID is the identity layer — no email, no passwords
Do not add username/password, magic links, or OAuth. The whole legal premise
depends on cryptographic identity bound to personnummer. Any "lighter" auth
path breaks the product.

## Architecture cheat sheet

```
src/lib/dal.ts            ← dispatcher, picks backend from env
├── dal-sqlite.ts         ← default, local dev
├── dal-supabase.ts       ← production
└── dal-mock.ts           ← legacy, in-memory

src/lib/bankid/           ← mock + real BankID clients behind one interface
src/lib/crypto.ts         ← AES-256-GCM, used for personnummer
src/lib/audit.ts          ← append-only log, never UPDATE/DELETE
```

All business logic is in API routes under `src/app/api/`. The frontend is
purely a consumer of that HTTP API. This is intentional: the planned
React Native app (Expo) will share the same backend.

### DAL contract
`src/lib/dal.ts` defines every call a route may make. If you add a new
query, add it to **all three** implementations (`dal-sqlite.ts`,
`dal-supabase.ts`, `dal-mock.ts`) or production will break.

### BankID flow
1. `POST /api/bankid/sign` → backend calls `bankidClient.sign()`, stores the
   pending order, returns `orderRef` + tokens.
2. Frontend (`BankIdSign.tsx`) polls `POST /api/bankid/collect` every 2s.
3. On `completionData`, backend persists signature, updates session, writes
   audit entry, marks pending order complete.
4. Frontend sees `status: "complete"` and routes on.

Never trust signer identity from the client. The only source of truth for
who signed is the `completionData` payload from the BankID API.

## Environment and build

- **Node runtime.** Several API routes use `better-sqlite3` and `bankid` (PFX
  certs). These must run on the Node runtime, not Edge. If you add
  `export const runtime = "edge"` anywhere touching DAL or BankID, you will
  break it.
- **Tailwind v4.** CSS-first config in `globals.css` — no `tailwind.config.js`.
- **Next.js 16 App Router.** Double-check params handling — async params is
  the rule now. `useParams()` in client components still works.

## Supabase setup (when moving off SQLite)

1. Create project at supabase.com.
2. Run `supabase/migrations/001_initial.sql` in the SQL editor.
3. Enable RLS on all tables. Suggested policies:
   - `consent_sessions`: no public access; all reads/writes via service role
     from API routes.
   - `bankid_signatures`: same — only service role.
   - `audit_log`: insert-only via service role, no update/delete.
   - `pending_bankid_orders`: service role only.
4. Set `DATABASE=supabase` + `NEXT_PUBLIC_SUPABASE_URL` +
   `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` / Vercel.

The app never uses the Supabase anon key. All DB access is server-side with
the service role. Do not introduce client-side Supabase calls.

## BankID real certificates

1. Download test cert `FPTestcert5_20240610.p12` from
   https://www.bankid.com/utvecklare/test (passphrase `qwerty123`).
2. Download test CA cert.
3. Place both in `certs/` (gitignored).
4. Set `BANKID_MOCK=false`, `BANKID_API_URL=https://appapi2.test.bankid.com/rp/v6.0`.
5. Verify with a real mobile BankID in test mode against a test personnummer.

Production: real RP-certificate from a Swedish bank acting as BankID issuer.
Expensive and slow to acquire — not blocking for demo, blocking for launch.

## GDPR/legal posture

- Personnummer is Art. 9 sensitive (indirectly) and must be encrypted at
  rest. `src/lib/crypto.ts` does AES-256-GCM; key in `ENCRYPTION_KEY` env.
  Never log personnummer. Never return it from the API.
- Signed-text content is stored in plaintext in `bankid_signatures.signed_text`
  for legal evidence purposes. That's intentional.
- Audit log is append-only. Don't add UPDATE/DELETE endpoints for it.
- Right-to-erasure = anonymize (set names/personnummer columns to NULL)
  without deleting audit rows.

## What Claude Code should probably tackle next

Ordered by value-per-effort, not urgency:

1. **Wire real BankID test certs** (half a day). Smallest change with the
   biggest demo impact — removes the TESTLÄGE banner, makes the flow real.
2. **Migrate to Supabase** (half a day). `DATABASE=supabase` already works;
   just needs a project + migration run + RLS policies.
3. **Rate limiting on `/api/bankid/sign`** (1-2 hours). Upstash Redis or
   Vercel KV. Currently a free DoS vector against the BankID quota.
4. **Integritetspolicy + villkor** as static pages. Pre-launch blocker.
5. **Expo mobile shell** (separate repo). Import the API surface.

## Things NOT to do

- Don't switch the styling framework (Tailwind v4 is here to stay).
- Don't add `useState` where server components work — but also don't convert
  `"use client"` pages to server components without understanding why they
  poll.
- Don't add i18n right now. Swedish-only is a deliberate scope constraint for
  the RFSU pitch. English can come after Swedish launch.
- Don't replace `better-sqlite3` with an ORM. The DAL is thin on purpose.
- Don't create parallel "v2" folders. Edit in place.

## When in doubt

Read `README.md` for product context, then this file for engineering
context, then the relevant Next.js docs in `node_modules/next/dist/docs/`.
