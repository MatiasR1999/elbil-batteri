# Overgang til Neon

Neon er valgt som måldatabase for Giret. Supabase brukes midlertidig bare av
det tekniske testmiljøet på `/lab`, slik at Smartcar-beviset kan fortsette å
samle observasjoner mens datalaget flyttes kontrollert.

## Målarkitektur

- Next.js på Vercel
- Neon Postgres opprettet gjennom Vercel-integrasjonen
- Managed Neon Auth, basert på Better Auth
- serverbasert datatilgang; nettleseren får ikke direkte databasepålogging
- Smartcar callback og webhook som i dag, men med Neon som lagringsmål

For den første piloten brukes Neons HTTP-driver til korte, enkeltstående
spørringer. Eksisterende databasefunksjoner gjør de kritiske callback- og
webhook-operasjonene atomiske i én databasespørring. Hvis Giret senere trenger
langvarige eller interaktive transaksjoner, byttes datalaget til en vanlig
Postgres-pool koblet til Vercel Fluid Compute.

## Hvorfor overgangen deles opp

Supabase-koden inneholder mer enn databasekall. Den håndterer også innlogging,
cookies, RLS og administrative kall. Å bytte alle delene i ett steg ville gjort
det vanskelig å skille migreringsfeil fra Smartcar-feil.

Landingssiden er derfor uavhengig av begge leverandører. Det gamle testmiljøet
forblir tilgjengelig på `/lab` frem til Neon-versjonen har bestått de samme
regresjonstestene.

## Fase 1 — opprett Neon-miljø

1. Installer Neon fra Vercel Marketplace for prosjektet.
2. Aktiver databasegrener for Preview Deployments.
3. Bruk `DATABASE_URL` for applikasjonen og `DATABASE_URL_UNPOOLED` for
   migrasjoner.
4. Aktiver Managed Neon Auth og legg inn `NEON_AUTH_BASE_URL` og en tilfeldig
   `NEON_AUTH_COOKIE_SECRET`.
5. Opprett staging før produksjon.

Miljøvariablene er dokumentert i `.env.example`.

## Fase 2 — porter datamodellen

Den eksisterende SQL-en kan i stor grad gjenbrukes fordi både Supabase og Neon
er PostgreSQL. Følgende Supabase-bindinger må fjernes:

- fremmednøkler mot `auth.users`
- policies som avhenger av `auth.uid()`
- grants til rollene `anon`, `authenticated` og `service_role`
- RPC-kall gjennom Supabase-klienten

Giret får en egen `app_users`-tabell med intern ID og unik ID fra
autentiseringsleverandøren. Alle brukerrelaterte tabeller beholder eksplisitt
`user_id`, og alle produktspørringer filtrerer på den autentiserte brukeren på
serveren.

Migreringen skal:

1. opprettes med et beskrivende navn
2. gjennomgås som SQL før kjøring
3. kjøres mot en Neon preview-/staging-gren først
4. verifiseres med de eksisterende database-regresjonstestene
5. ha en rollback som peker applikasjonen tilbake til Supabase-testmiljøet

## Fase 3 — flytt applikasjonskoden

Rekkefølgen er bevisst:

1. Neon-klient og miljøvalidering
2. Neon Auth og sesjonslesing
3. kjøretøy og signalrapportering
4. Smartcar Connect-sessioner og callback
5. webhook-inntak og råhendelser
6. scripts for testwebhook og signalrapport

Hver del flyttes og testes før neste del starter. Det skal ikke være skjulte
dobbeltskrivinger mellom databasene.

## Fase 4 — data og cutover

Med få pilotbiler er standardvalget en ren Neon-start. Dersom
observasjonsdataene fra Supabase skal beholdes, eksporteres de med `pg_dump` og
importeres til en midlertidig Neon-gren før produksjonsgrenen oppdateres.

Cutover er ferdig når:

- innlogging, callback, webhook og rapportering kjører mot Neon
- duplikate webhooker fortsatt er idempotente
- hendelser ute av rekkefølge fortsatt håndteres korrekt
- råpayload-retensjon fortsatt virker
- tester, typekontroll, lint og produksjonsbygg er grønne
- Supabase-pakkene, miljøvariablene, proxy-koden og `/supabase` kan fjernes

Ingen produksjonsdata slettes som del av overgangen.
