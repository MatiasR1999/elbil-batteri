# Syvdagers observasjonsprotokoll

Formålet er å avgjøre om Smartcar-dataene er stabile og detaljerte nok til at
resten av Giret bør bygges. Ikke bruk perioden til å validere batterihelse.

## Før start

- migrasjonene er kjørt i et eget stagingmiljø
- webhooken er verifisert og har auto-enrollment avslått
- én simulert bil har levert en vellykket `FIRST_DELIVERY`
- signatur, duplikat og feilbehandling er testet
- ingen posisjonssignaler eller `Charge.ChargeRecords` er aktivert
- testbileieren har godkjent datainnsamlingen
- klokkeslett, tidssone, bilmodell og OEM-appens viste verdier dokumenteres

## Dag 0

1. Koble den ekte bilen gjennom Connect.
2. Abonner bilen på webhooken.
3. Ta et kontrollbilde eller en manuell notering fra bilens originale app.
4. Bekreft at første råhendelse og signalmålinger vises i Giret.
5. Noter alle signaler som er utilgjengelige eller gir
   `VEHICLE_NOT_CAPABLE`.

## Dag 1–6

Utfør normal bruk, men sørg om mulig for at perioden inneholder:

- minst tre kjøreturer med ulik lengde
- minst én lengre parkert periode
- minst to ladeøkter
- én tilkobling av ladekabel uten umiddelbar lading, hvis praktisk
- både lavere og høyere batteriprosent

Kontroller daglig:

- at nye webhooker fortsatt kommer inn
- at behandlingsfeil ikke blir stående
- at OEM-tidspunkt og Smartcar-hentetid ikke blandes
- om samme signal gjentas uten at OEM-tidspunktet endres
- om bilen må vekkes for at data skal oppdateres
- om Connect krever ny godkjenning
- avvik mot verdiene i bilens originale app

Ikke gjør ekstra API-kall bare for å vekke bilen. Søvnadferd er en del av
observasjonen.

## Dag 7

Generer rapporten:

```bash
npm run report:signals -- --days=7 --vehicle=<lokal-kjøretøy-id>
```

Arkiver rapporten sammen med:

- Smartcar Dashboard delivery-logg
- bilmodell, årsmodell, batterivariant og kilometerstand
- manuelle kontrollmålinger
- kjente kjøreturer og ladeøkter
- beskrivelse av søvn-/oppvåkningsadferd
- faktisk Smartcar-kostnad for bilen

Råpayload skal ikke kopieres til delte dokumenter uten at identifiserende
opplysninger er fjernet.

## Foreløpig go/no-go

Minimum for kodeporten:

- batteriprosent, rekkevidde, kilometerstand og ladestatus har minst to
  distinkte OEM-tidspunkter hver; gjentatte webhook-leveranser teller ikke
- observasjonen dekker omtrent seks av syv døgn
- ingen råhendelser står igjen med behandlingsfeil

Manuell produktport:

- tidsstemplene er forståelige og har brukbar ferskhet
- data kommer uten hyppig manuell oppfølging
- turstart/-slutt kan sannsynligvis utledes fra kilometerstand eller hastighet
- ladestart/-slutt kan sannsynligvis utledes fra ladestatus
- manglende EnergyAdded, ladehistorikk eller hastighet er uttrykkelig vurdert
- verdien av historikk og rapport er fortsatt høy nok med faktisk signaldekning
- kostnad per aktiv bil er akseptabel

Koden kan bare gi en foreløpig signalgate. Endelig go/no-go krever den manuelle
produktporten.
