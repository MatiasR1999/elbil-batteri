# Smartcar-oppsett for milepæl 0

Sist kontrollert mot Smartcar-dokumentasjonen: 5. september 2026.

## 1. Opprett applikasjonen

1. Opprett en Smartcar-konto og en applikasjon i Dashboard.
2. Kontroller at applikasjonen bruker Vehicle API v3 og webhook-tilbudet.
3. Opprett eller hent følgende tre typer legitimasjon:
   - Application ID for Smartcar Connect
   - API Client ID og Client Secret for OAuth Client Credentials
   - Application Management Token for webhook-HMAC
4. Legg verdiene i Vercel og `.env.local` med navnene fra `.env.example`.

Client Secret og Management Token skal aldri inn i Smartcar-URL-en eller
nettleserkoden.

## 2. Registrer redirect-URI-er

Legg til eksakt callback for hvert miljø:

- lokalt: `http://localhost:3000/api/smartcar/callback`
- staging: `https://<staging-domene>/api/smartcar/callback`
- produksjon: `https://<produksjonsdomene>/api/smartcar/callback`

Sett samme URI i `SMARTCAR_REDIRECT_URI` i det aktuelle miljøet.

Giret bruker `response_type=none`, fordi Vehicle API v3 bruker ett
applikasjonstoken. Callbacken mottar fortsatt `user_id`, `external_id` og
`state`. Det finnes derfor ingen auth code eller refresh token som skal lagres
per bil.

## 3. Konfigurer Vehicle Access

La Dashboard utlede nødvendige tillatelser fra valgte signaler. Ikke vedlikehold
en separat scope-liste i kildekoden.

Velg disse kjernesignalene:

- `TractionBattery.StateOfCharge`
- `TractionBattery.Range`
- `Odometer.TraveledDistance`
- `Charge.IsCharging`

Velg deretter disse dersom planen og bildekningen tillater det:

- `Charge.IsChargingCableConnected`
- `Charge.Wattage`
- `Charge.Voltage`
- `Charge.Amperage`
- `Charge.EnergyAdded`
- `TractionBattery.NominalCapacity`
- `Motion.CurrentSpeed`

Ikke velg `Location.PreciseLocation` i milepæl 0.

`Charge.ChargeRecords` kan inneholde koordinater og adresse. Det skal derfor
ikke aktiveres i standardoppsettet selv om ladehistorikk er relevant. Signalet
krever en senere, separat opt-in, dataminimering og oppbevaringspolicy.

Marker bare de fire kjernesignalene som påkrevd dersom Giret ikke kan gi
grunnverdi uten dem. Øvrige tillatelser bør kunne velges bort av bileieren.

## 4. Opprett webhooken

Opprett én webhook-integrasjon.

Callback:

`https://<offentlig-miljø>/api/webhooks/smartcar`

Anbefalte triggere:

- `TractionBattery.StateOfCharge`
- `Odometer.TraveledDistance`
- `Charge.IsCharging`
- `Charge.IsChargingCableConnected`
- `Motion.CurrentSpeed`, dersom tilgjengelig

Legg alle valgte, ikke-posisjonsbaserte signaler i webhookens datafelt.
Smartcar sender alle valgte datasignaler når én trigger endrer seg.

Under teknisk bevis:

1. La auto-enrollment være av.
2. Lagre webhooken.
3. Kjør Verify i Dashboard. Ruten verifiserer `SC-Signature` før den svarer
   på `VERIFY` med HMAC av challenge.
4. Koble først til en simulert bil.
5. Abonner bilen manuelt på webhooken.
6. Bekreft en `FIRST_DELIVERY` og normaliserte målinger i Giret.
7. Gjenta for minst én ekte bil.

Auto-enrollment kan aktiveres etter at mottaket er validert og kostnaden er
forstått.

## 5. Simulert og ekte modus

Velg «Simulert bil» på observasjonssiden først. Når hele flyten er bekreftet,
velg «Ekte bil». Modusen lagres med Connect-forsøket, og callbacken aksepterer
bare tilkoblinger i samme modus.

## 6. Sikkerhetskontroll

Før en bil abonneres:

- ugyldig eller manglende `SC-Signature` skal gi HTTP 401
- duplikat av samme `eventId` skal ikke opprette flere råhendelser eller målinger
- en signert `VERIFY` skal returnere HTTP 200 med
  `{"challenge":"<hmac>"}`; usignert `VERIFY` skal gi HTTP 401
- service role key skal bare brukes i serverruter og scripts
- rå payload skal ikke logges
- ingen posisjonssignaler skal være valgt

## 7. Kilder

- [Getting started](https://smartcar.com/docs/getting-started/introduction)
- [Build the Connect URL](https://smartcar.com/docs/connect/redirect-to-connect)
- [Handle the response](https://smartcar.com/docs/connect/handle-the-response)
- [API authentication](https://smartcar.com/docs/getting-started/how-to/api-authentication)
- [Signals](https://smartcar.com/docs/api-reference/signals/schema)
- [Receiving webhooks](https://smartcar.com/docs/integrations/webhooks/receiving-webhooks)
- [Payload verification](https://smartcar.com/docs/integrations/webhooks/payload-verification)
- [Delivery behavior](https://smartcar.com/docs/api-reference/webhooks/delivery-behavior)
