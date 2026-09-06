# Giret

Giret gjør tilgjengelige bildata forståelige og bygger en dokumentert historikk
som bileieren kan bruke i hverdagen og ved salg.

Forsiden er nå en kundevendt produktpresentasjon. Det tekniske Smartcar-beviset
ligger på `/lab` mens datalaget flyttes kontrollert fra Supabase til Neon.

## Dette finnes nå

- responsiv landingsside med produktoversikt og egen sosial delingsgrafikk
- teknisk Next.js-observasjonsside på `/lab`
- to originale kampanjebilder optimalisert med `next/image`
- e-postinnlogging i det midlertidige testmiljøet
- Smartcar Connect for simulerte og ekte biler
- kortlivet, én-gangs `state` som beskytter callbacken
- Smartcar v3-applikasjonstilgang uten per-bil-tokener i databasen
- signaturverifisering mot urørt webhook-body, også for `VERIFY`
- støtte for `VERIFY`, `VEHICLE_STATE` og `VEHICLE_ERROR`
- idempotent rålagring på `eventId`
- normalisering av signalverdier og separate OEM-/Smartcar-tidspunkter
- atomisk callback-synkronisering med autentisert retry
- reprosessering dersom første webhook kommer før callbacken er synkronisert
- RLS på alle brukerrelaterte tabeller
- signalrapport for en avgrenset observasjonsperiode
- 30 dagers råpayload-retensjon; deduplisering og normaliserte målinger beholdes

Ingen kjøretøykommandoer er implementert.

## Valgt målstakk

- Next.js på Vercel
- Neon Postgres via Vercel-integrasjonen
- Managed Neon Auth
- Smartcar for lesetilgang til støttede bildata

Se [overgangsplanen for Neon](docs/NEON_MIGRATION.md). Supabase-avhengighetene
er fortsatt nødvendige for `/lab` frem til Neon-versjonen har bestått de samme
regresjonstestene.

## Lokal oppstart

Krav: Node.js 24, Docker og en Smartcar-konto.

```bash
nvm use
npm install
npx supabase start
cp .env.example .env.local
npm run dev
```

Fyll `.env.local` med URL og nøkler fra `supabase start`. Kjør migrasjonene på
nytt ved behov:

```bash
npx supabase db reset
```

Åpne `http://localhost:3000` for landingssiden og
`http://localhost:3000/lab` for testmiljøet. Lokal e-post fanges av Supabase
Mailpit på `http://localhost:54324`.

## Smartcar

Følg [Smartcar-oppsettet](docs/SMARTCAR_SETUP.md). De to viktigste URL-ene er:

- callback: `https://<miljø>/api/smartcar/callback`
- webhook: `https://<miljø>/api/webhooks/smartcar`

Lokale webhooker krever en offentlig HTTPS-tunnel. Smartcars callback kan bruke
`http://localhost:3000`, men webhooken kan ikke peke til localhost.

Integrasjonen følger Smartcars v3-modell fra september 2026:

- Connect kjøres med `response_type=none`
- Giret lagrer `user_id` og bruker `external_id` for kobling til intern bruker
- Vehicle API bruker OAuth 2.0 Client Credentials
- webhooker verifiseres med Application Management Token

## Verifisering

```bash
npm test
npm run lint
npm run typecheck
npm run build
npx supabase test db
```

Et lokalt, signert testevent kan sendes etter at en bil er synkronisert:

```bash
npm run test:webhook -- \
  --user=<smartcar-user-id> \
  --vehicle=<smartcar-vehicle-id>
```

Etter observasjonsperioden:

```bash
npm run report:signals -- --days=7
```

Bruk `--vehicle=<lokal-uuid>` for én bil. Rapporten gir en foreløpig signalgate,
men rådata, tidsstempler og OEM-adferd må fortsatt vurderes manuelt.

## Deploy

1. Koble prosjektet til Neon gjennom Vercel Marketplace.
2. Aktiver preview-grener og opprett et eget staging-miljø.
3. Legg inn variablene fra `.env.example` i Vercel.
4. Følg cutover-rekkefølgen i `docs/NEON_MIGRATION.md`.
5. Oppdater Smartcar callback- og webhook-URL.
6. Verifiser webhooken i Smartcar Dashboard før en bil abonneres.

Database-URL, auth-cookie-hemmelighet, Supabase service role key under
overgangen, Smartcar Client Secret og Application Management Token er
serverhemmeligheter og skal aldri ha `NEXT_PUBLIC_`-prefiks.

## Avgrensning

Kodebasen kan testes med Smartcars simulator uten eksterne handlinger fra
utvikleren. Opprettelse av kontoer, innlegging av hemmeligheter og tilkobling til
en ekte bil krever prosjekteiers tilgang. Go/no-go kan derfor først avgjøres
etter den beskrevne syvdagersobservasjonen.
