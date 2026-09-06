import type { Metadata } from "next";

import { AuthPanel } from "@/components/auth-panel";
import { ConnectCarButton } from "@/components/connect-car-button";
import { RetrySmartcarButton } from "@/components/retry-smartcar-button";
import { getSmartcarConnectMode } from "@/lib/env";
import { PRIORITY_SIGNALS } from "@/lib/smartcar/signals";
import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teknisk testmiljø · Giret",
  description: "Internt testmiljø for signaldekning og Smartcar-integrasjon.",
  robots: {
    index: false,
    follow: false,
  },
};

type VehicleRow = {
  id: string;
  make: string;
  model: string;
  year: number;
  smartcar_mode: "live" | "simulated";
  connected_at: string;
  last_data_at: string | null;
};

type CoverageRow = {
  vehicle_id: string;
  signal_code: string;
  reading_count: number;
  successful_reading_count: number;
  distinct_oem_observation_count: number;
  error_reading_count: number;
  first_received_at: string | null;
  last_received_at: string | null;
  average_interval_seconds: number | null;
};

type ReadingRow = {
  id: number;
  vehicle_id: string;
  signal_code: string;
  numeric_value: number | string | null;
  text_value: string | null;
  boolean_value: boolean | null;
  unit: string | null;
  oem_updated_at: string | null;
  received_at: string;
  quality_status: string;
};

type RawEventRow = {
  event_id: string;
  event_type: string;
  received_at: string;
  processed_at: string | null;
  processing_error: string | null;
};

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function formatDate(value: string | null) {
  if (!value) {
    return "Ingen data ennå";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatInterval(seconds: number | null) {
  if (!seconds) {
    return "–";
  }

  if (seconds < 120) {
    return `${Math.round(seconds)} sek`;
  }

  if (seconds < 7_200) {
    return `${Math.round(seconds / 60)} min`;
  }

  return `${(seconds / 3_600).toFixed(1)} t`;
}

function formatReadingValue(reading: ReadingRow) {
  const value =
    reading.numeric_value ??
    reading.text_value ??
    (reading.boolean_value === null
      ? "Utilgjengelig"
      : reading.boolean_value
        ? "Ja"
        : "Nei");

  return `${value}${reading.unit ? ` ${reading.unit}` : ""}`;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const reasonMessages: Record<string, string> = {
  access_denied: "Smartcar-tilkoblingen ble avbrutt.",
  connection_not_visible_yet:
    "Tilkoblingen er godkjent, men er ikke synlig i API-et ennå. Prøv igjen om litt.",
  expired_state: "Tilkoblingsforsøket var utløpt eller allerede brukt.",
  identity_mismatch: "Smartcar-identiteten samsvarte ikke med brukeren.",
  invalid_state: "Smartcar-callbacken manglet gyldig sikkerhetstilstand.",
  sync_failed: "Bilen ble godkjent, men synkroniseringen feilet.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabaseConfigured = isSupabaseConfigured();
  const smartcarConfigured = Boolean(
    process.env.SMARTCAR_APPLICATION_ID &&
      process.env.SMARTCAR_CLIENT_ID &&
      process.env.SMARTCAR_CLIENT_SECRET &&
      process.env.SMARTCAR_MANAGEMENT_TOKEN &&
      process.env.SMARTCAR_REDIRECT_URI,
  );

  let userEmail: string | undefined;
  let vehicles: VehicleRow[] = [];
  let coverage: CoverageRow[] = [];
  let readings: ReadingRow[] = [];
  let rawEvents: RawEventRow[] = [];
  let dataError: string | undefined;

  if (supabaseConfigured) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      const reference = crypto.randomUUID();
      console.error("Kunne ikke hente Supabase-bruker", {
        reference,
        error: userError,
      });
      dataError = `Innloggingsstatus kunne ikke lastes. Referanse: ${reference}`;
    }

    userEmail = user?.email;

    if (user) {
      const [vehicleResult, coverageResult, readingResult, eventResult] =
        await Promise.all([
          supabase
            .from("vehicles")
            .select(
              "id,make,model,year,smartcar_mode,connected_at,last_data_at",
            )
            .order("connected_at", { ascending: false }),
          supabase
            .from("vehicle_signal_coverage")
            .select(
              "vehicle_id,signal_code,reading_count,successful_reading_count,distinct_oem_observation_count,error_reading_count,first_received_at,last_received_at,average_interval_seconds",
            )
            .order("signal_code"),
          supabase
            .from("vehicle_signal_readings")
            .select(
              "id,vehicle_id,signal_code,numeric_value,text_value,boolean_value,unit,oem_updated_at,received_at,quality_status",
            )
            .order("received_at", { ascending: false })
            .limit(20),
          supabase
            .from("raw_smartcar_events")
            .select(
              "event_id,event_type,received_at,processed_at,processing_error",
            )
            .order("received_at", { ascending: false })
            .limit(12),
        ]);

      const queryErrors = [
        vehicleResult.error,
        coverageResult.error,
        readingResult.error,
        eventResult.error,
      ].filter(Boolean);

      if (queryErrors.length > 0) {
        const reference = crypto.randomUUID();
        console.error("Kunne ikke laste observasjonsdata", {
          reference,
          errors: queryErrors,
        });
        dataError = `Bildata kunne ikke lastes. Referanse: ${reference}`;
      } else {
        vehicles = (vehicleResult.data ?? []) as VehicleRow[];
        coverage = (coverageResult.data ?? []) as CoverageRow[];
        readings = (readingResult.data ?? []) as ReadingRow[];
        rawEvents = (eventResult.data ?? []) as RawEventRow[];
      }
    }
  }

  const smartcarStatus = firstParam(params.smartcar);
  const reason = firstParam(params.reason);
  const syncSession = firstParam(params.session);
  const authStatus = firstParam(params.auth);

  return (
    <main>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <span className="brand">Giret</span>
            <p className="eyebrow">Teknisk bevis · milepæl 0</p>
            <h1>Finn ut hva bilen faktisk forteller oss.</h1>
            <p className="lead">
              Denne observasjonssiden kobler en bil gjennom Smartcar, lagrer
              signerte webhooker og dokumenterer signaldekning før
              kundeproduktet bygges.
            </p>
          </div>
          <div className="hero-panel">
            <div className="status-line">
              <span
                className={`status-dot ${supabaseConfigured ? "ok" : ""}`}
              />
              <div>
                <strong>Supabase</strong>
                <span>{supabaseConfigured ? "Konfigurert" : "Mangler miljøvariabler"}</span>
              </div>
            </div>
            <div className="status-line">
              <span
                className={`status-dot ${smartcarConfigured ? "ok" : ""}`}
              />
              <div>
                <strong>Smartcar</strong>
                <span>{smartcarConfigured ? "Konfigurert" : "Mangler miljøvariabler"}</span>
              </div>
            </div>
            <div className="status-line">
              <span className="status-dot ok" />
              <div>
                <strong>Webhook-rute</strong>
                <span>/api/webhooks/smartcar</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="shell content-stack">
        {dataError ? (
          <div className="notice notice-warning">{dataError}</div>
        ) : null}

        {authStatus === "confirmed" ? (
          <div className="notice notice-success">
            Innloggingen er bekreftet.
          </div>
        ) : null}

        {smartcarStatus === "connected" ? (
          <div className="notice notice-success">
            Smartcar er koblet til. Første webhook kan bruke noen minutter.
          </div>
        ) : null}

        {smartcarStatus === "pending" || smartcarStatus === "error" ? (
          <div className="notice notice-warning">
            {reasonMessages[reason ?? ""] ??
              "Smartcar-tilkoblingen ble ikke fullført."}
            {syncSession && userEmail ? (
              <RetrySmartcarButton sessionId={syncSession} />
            ) : null}
          </div>
        ) : null}

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">1 · Tilgang</p>
              <h2>Logg inn og koble til</h2>
            </div>
            <span className="phase-tag">Lesebasert</span>
          </div>

          <AuthPanel
            configured={supabaseConfigured}
            userEmail={userEmail}
          />

          {userEmail && smartcarConfigured ? (
            <ConnectCarButton defaultMode={getSmartcarConnectMode()} />
          ) : userEmail ? (
            <div className="notice notice-warning">
              Legg inn Smartcar-variablene før du starter Connect.
            </div>
          ) : null}
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">2 · Kjøretøy</p>
              <h2>Tilkoblede testbiler</h2>
            </div>
            <span className="count-badge">{vehicles.length}</span>
          </div>

          {vehicles.length === 0 ? (
            <div className="empty-state">
              Ingen biler er synkronisert ennå. Start med en simulert bil.
            </div>
          ) : (
            <div className="vehicle-grid">
              {vehicles.map((vehicle) => {
                const vehicleCoverage = coverage.filter(
                  (row) => row.vehicle_id === vehicle.id,
                );
                const observedRequired = PRIORITY_SIGNALS.filter(
                  (signal) =>
                    signal.requiredForGo &&
                    vehicleCoverage.some(
                      (row) =>
                        row.signal_code === signal.code &&
                        row.distinct_oem_observation_count > 0,
                    ),
                ).length;
                const requiredCount = PRIORITY_SIGNALS.filter(
                  (signal) => signal.requiredForGo,
                ).length;

                return (
                  <article className="vehicle-card" key={vehicle.id}>
                    <div className="vehicle-title">
                      <div>
                        <span className="eyebrow">
                          {vehicle.smartcar_mode === "live"
                            ? "Ekte bil"
                            : "Simulert bil"}
                        </span>
                        <h3>
                          {vehicle.make} {vehicle.model}
                        </h3>
                        <p>{vehicle.year}</p>
                      </div>
                      <span
                        className={`score-ring ${
                          observedRequired === requiredCount ? "complete" : ""
                        }`}
                      >
                        {observedRequired}/{requiredCount}
                      </span>
                    </div>
                    <dl className="vehicle-meta">
                      <div>
                        <dt>Tilkoblet</dt>
                        <dd>{formatDate(vehicle.connected_at)}</dd>
                      </div>
                      <div>
                        <dt>Siste data</dt>
                        <dd>{formatDate(vehicle.last_data_at)}</dd>
                      </div>
                    </dl>
                    <div className="signal-list">
                      {PRIORITY_SIGNALS.map((signal) => {
                        const row = vehicleCoverage.find(
                          (item) => item.signal_code === signal.code,
                        );
                        const state =
                          (row?.distinct_oem_observation_count ?? 0) > 0
                            ? "observed"
                            : row
                              ? "error"
                              : "missing";

                        return (
                          <div className="signal-row" key={signal.code}>
                            <span className={`signal-state ${state}`} />
                            <div>
                              <strong>{signal.label}</strong>
                              <span>
                                {state === "observed"
                                  ? `${row?.distinct_oem_observation_count} unike OEM-målinger · ${row?.successful_reading_count} leveranser · ca. ${formatInterval(row?.average_interval_seconds ?? null)}`
                                  : state === "error"
                                    ? "Mottatt, men utilgjengelig"
                                    : "Ikke observert"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">3 · Målinger</p>
              <h2>Siste normaliserte signaler</h2>
            </div>
            <span className="count-badge">{readings.length}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Verdi</th>
                  <th>OEM oppdatert</th>
                  <th>Mottatt</th>
                  <th>Kvalitet</th>
                </tr>
              </thead>
              <tbody>
                {readings.length ? (
                  readings.map((reading) => (
                    <tr key={reading.id}>
                      <td>
                        <code>{reading.signal_code}</code>
                      </td>
                      <td>{formatReadingValue(reading)}</td>
                      <td>{formatDate(reading.oem_updated_at)}</td>
                      <td>{formatDate(reading.received_at)}</td>
                      <td>{reading.quality_status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="table-empty" colSpan={5}>
                      Ingen signalmålinger mottatt.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">4 · Råhendelser</p>
              <h2>Siste Smartcar-leveranser</h2>
            </div>
            <span className="count-badge">{rawEvents.length}</span>
          </div>
          <div className="event-list">
            {rawEvents.length ? (
              rawEvents.map((event) => (
                <div className="event-row" key={event.event_id}>
                  <span
                    className={`signal-state ${
                      event.processing_error ? "error" : "observed"
                    }`}
                  />
                  <div>
                    <strong>{event.event_type}</strong>
                    <span>
                      {event.event_id.slice(0, 8)} ·{" "}
                      {formatDate(event.received_at)}
                    </span>
                  </div>
                  <span className="event-result">
                    {event.processing_error
                      ? event.processing_error
                      : event.processed_at
                        ? "Behandlet"
                        : "Venter"}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state compact">
                Ingen webhook-hendelser mottatt.
              </div>
            )}
          </div>
        </section>

        <footer>
          <span>Giret teknisk bevis</span>
          <span>Målte data · ingen kjøretøykommandoer</span>
        </footer>
      </div>
    </main>
  );
}
