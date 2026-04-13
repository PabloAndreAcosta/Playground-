# Concent

> Dokumenterat ömsesidigt samtycke med BankID. Före och efter.
>
> **Skydda dig. Skydda varandra.**

Concent är en app för att dokumentera ömsesidigt samtycke med BankID-signering
— en före handlingen, och en bekräftelse tre dagar senare. Den är positionerad
som ett *skyddande* verktyg, inte ett kontrakt: en digital analogi till
kondomen.

Målet är en juridiskt hållbar och etiskt försvarbar MVP som kan presenteras för
RFSU eller motsvarande partner som stödjer lansering.

## Innehåll

- [Status](#status)
- [Så fungerar det](#så-fungerar-det)
- [Arkitektur](#arkitektur)
- [Kom igång](#kom-igång)
- [Kodkarta](#kodkarta)
- [Miljövariabler](#miljövariabler)
- [Testläge vs produktion](#testläge-vs-produktion)
- [Roadmap](#roadmap)
- [Produktbeslut och motivering](#produktbeslut-och-motivering)

## Status

MVP-nivå, webbprototyp. Hela samtyckesflödet fungerar end-to-end med
BankID-mock och lokal SQLite. Saknas för lansering: riktigt
BankID-testcertifikat, Supabase-migration, juridisk granskning,
integritetspolicy, och mobilklient.

Se [Roadmap](#roadmap) för exakt vad som återstår.

## Så fungerar det

1. **Innan.** Initiator väljer överenskommelser på `/ny` och signerar med
   BankID. En delningslänk genereras.
2. **Partnern ansluter.** Partnern öppnar `/join/[token]`, ser villkoren, och
   signerar själv med BankID. Status blir `consented`.
3. **Tre dagar senare.** Båda parter ombeds bekräfta i lugn och ro att allt
   gick bra. Bekräftelselåset öppnas automatiskt efter 72 timmar.
4. **Alltid.** Vem som helst kan när som helst återkalla sitt samtycke.
   Återkallandet signeras också med BankID och sparas som juridiskt bevis.

Fördröjningen på tre dagar är designvalet som gör appen till ett skydd snarare
än ett verktyg för förövare — efterbekräftelsen kan inte pressas fram i
stunden.

## Arkitektur

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Next.js Web │────▶│  Next.js API │────▶│  SQLite / Supabase│
│  (Vercel)    │     │   Routes     │     │                   │
└─────────────┘     └──────┬───────┘     └──────────────────┘
                           │
┌─────────────┐            │              ┌─────────────────┐
│ React Native │───────────┘              │   BankID API    │
│ Expo (senare)│                          │  (test/prod)    │
└─────────────┘                           └─────────────────┘
```

- **Web + API:** Next.js 16 App Router, TypeScript, Tailwind v4.
- **Databas:** Pluggbar via `DATABASE`-envar — SQLite för lokal utveckling
  (default), Supabase/Postgres för produktion.
- **BankID:** Pluggbar via `BANKID_MOCK` — mock för utveckling, riktig
  `bankid`-klient när certifikat finns.
- **Mobil:** Avsiktligt förberedd för React Native/Expo — all affärslogik bor
  bakom HTTP-API:et, inga sessionscookies, inga server-komponenter i
  sessionflödet.

## Kom igång

```bash
# 1. Klona och installera
npm install

# 2. Kopiera miljövariabler
cp .env.example .env.local

# 3. Generera krypteringsnycklar (skriv in dem i .env.local)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Kör dev-servern
npm run dev
```

Öppna http://localhost:3000. Default-konfigurationen använder SQLite
(`data/concent.db`) och BankID-mock (4 sekunders fördröjning, alternerar mellan
Karl Karlsson och Anna Andersson).

## Kodkarta

```
src/
├── app/
│   ├── page.tsx              Landning: hero, "Så fungerar det", senaste
│   ├── ny/page.tsx           Skapa session → BankID-signering
│   ├── join/[token]/page.tsx Partnerflöde via delningslänk
│   ├── session/[id]/page.tsx Sessionsvy, 3-dagars låsning, bekräfta/återkalla
│   ├── historik/page.tsx     Lista med filter per status
│   ├── layout.tsx            Header/footer, testläge-banner
│   └── api/
│       ├── sessions/         POST, GET, GET/[id], DELETE/[id]
│       ├── bankid/           sign, collect, cancel
│       └── invite/[token]/   Lös delningslänk → session-info
├── components/
│   ├── BankIdSign.tsx        Orchestrering: QR + autostart + polling
│   ├── QrCode.tsx            Animerad QR (HMAC-genererad per sekund)
│   ├── StatusBadge.tsx       Status-pill
│   └── ShareLink.tsx         Kopiera partner-länk
└── lib/
    ├── dal.ts                Data Access Layer-dispatcher
    ├── dal-sqlite.ts         SQLite-implementation (default)
    ├── dal-supabase.ts       Supabase-implementation
    ├── dal-mock.ts           In-memory (legacy)
    ├── audit.ts              Append-only audit log
    ├── crypto.ts             AES-256-GCM för personnummer
    ├── bankid/               BankID-klient (mock + real)
    ├── sqlite/               SQLite-schema och init
    └── supabase/             Supabase-klient och typer
supabase/
└── migrations/001_initial.sql
```

## Miljövariabler

Alla variabler dokumenteras i `.env.example`. Kritiska:

| Variabel | Beskrivning |
|----------|-------------|
| `DATABASE` | `sqlite` (default) eller `supabase` |
| `BANKID_MOCK` | `true` (default) eller `false` för riktig BankID |
| `ENCRYPTION_KEY` | 32 byte hex — krypterar personnummer i databasen |
| `SESSION_SECRET` | 32+ tecken — signering av delningstokens |
| `NEXT_PUBLIC_SUPABASE_URL` | Bara om `DATABASE=supabase` |
| `SUPABASE_SERVICE_ROLE_KEY` | Bara om `DATABASE=supabase` |
| `BANKID_PFX_PATH` | Bara om `BANKID_MOCK=false` |
| `BANKID_PFX_PASSPHRASE` | Bara om `BANKID_MOCK=false` |

## Testläge vs produktion

### Testläge (default)
- `DATABASE=sqlite` — `data/concent.db` skapas automatiskt.
- `BANKID_MOCK=true` — simulerad BankID-signering (4 s), alternerar
  Karl/Anna, genererar fejkade signaturer och personnummer.
- Orange `TESTLÄGE`-banner visas högst upp på alla sidor.

### Produktion
- `DATABASE=supabase` + Supabase-projekt kört via `supabase/migrations/`.
- `BANKID_MOCK=false` + PFX-certifikat från BankID (test- eller prod-CA).
- `ENCRYPTION_KEY` och `SESSION_SECRET` satt till riktiga 32-byte-värden.
- `NEXT_PUBLIC_BASE_URL` satt till publik URL.

## Roadmap

### Klart
- [x] Full UI-flöde (landning, skapa, partner, session, historik)
- [x] Pluggbar DAL (SQLite + Supabase + mock)
- [x] Pluggbar BankID (mock + real-klient)
- [x] 3-dagars bekräftelselåsning med live-countdown
- [x] Återkalla samtycke (signerat)
- [x] Audit log (append-only)
- [x] AES-256-GCM-kryptering av personnummer
- [x] Supabase-migration (`supabase/migrations/001_initial.sql`)
- [x] Delningslänkar med unika tokens
- [x] Status-maskin: pending_initiator → pending_partner → consented →
  confirmed / withdrawn

### Nästa steg (för Claude Code)
1. **BankID test-certifikat.** Hämta `FPTestcert5_20240610.p12` från BankID,
   lägg i `certs/`, sätt `BANKID_MOCK=false`, verifiera end-to-end-flödet mot
   `appapi2.test.bankid.com`.
2. **Supabase-provisionering.** Skapa Supabase-projekt, kör
   `001_initial.sql`, sätt RLS-policys (se avsnitt nedan i `AGENTS.md`),
   byt `DATABASE=supabase`, verifiera.
3. **Rate limiting.** `/api/bankid/sign` och `/api/sessions` bör skyddas
   (t.ex. Upstash Redis eller Vercel KV).
4. **Integritetspolicy + villkor.** Måste finnas publikt innan lansering.
   GDPR Art. 9 (känsliga personuppgifter) kräver explicit samtycke och
   dataskyddskonsekvensbedömning.
5. **Rätt till radering.** Implementera anonymisering som behåller audit log
   utan PII.
6. **Mobilapp.** Expo-projekt i separat repo, importerar samma OpenAPI-schema.
   `universalLink` för `bankid://`-schemat måste konfigureras.
7. **Pre-launch:** juridisk granskning av signerad text, penetrationstest,
   DPIA, RFSU-partnerskap.

### Uttryckligen utanför scope
- Överfallslarm / nödknapp (skulle underminera positioneringen och duplicera
  112 / Sörja för din egen säkerhet-appen).
- Universellt samtycke för godtyckliga situationer (avsiktlig nisch: sexuellt
  samtycke).
- Tredjepartsinloggning (BankID är hela poängen).

## Produktbeslut och motivering

Läs `AGENTS.md` för djupare motivering av produktval — särskilt:
- Varför 3-dagars fördröjning
- Varför kondom-analogin är kärnan i positioneringen
- Varför RFSU-partnerskap är rätt go-to-market
- Varför överfallslarm inte byggs

## Licens

Proprietär — inga användningsrättigheter utan tillstånd.
