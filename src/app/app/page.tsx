import { ConnectCarButton } from "@/components/connect-car-button";
import { RetrySmartcarButton } from "@/components/retry-smartcar-button";
import { getSmartcarConnectMode } from "@/lib/env";
import {
  formatPanelDate,
  formatReading,
  getPanelOverview,
  latestReading,
} from "@/lib/panel/session";

const reasonMessages: Record<string, string> = {
  access_denied: "Tilkoblingen ble avbrutt.",
  connection_not_visible_yet:
    "Tilkoblingen er godkjent, men er ikke synlig ennå. Prøv igjen om litt.",
  expired_state: "Tilkoblingsforsøket var utløpt.",
  identity_mismatch: "Identiteten samsvarte ikke med brukeren.",
  invalid_state: "Tilkoblingen manglet gyldig sikkerhetstilstand.",
  sync_failed: "Bilen ble godkjent, men synkroniseringen feilet.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppOverviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { vehicles, readings } = await getPanelOverview();
  const vehicle = vehicles[0];
  const vehicleReadings = vehicle
    ? readings.filter((reading) => reading.vehicle_id === vehicle.id)
    : [];
  const smartcarStatus = firstParam(params.smartcar);
  const reason = firstParam(params.reason);
  const syncSession = firstParam(params.session);
  const smartcarConfigured = Boolean(
    process.env.SMARTCAR_APPLICATION_ID &&
      process.env.SMARTCAR_CLIENT_ID &&
      process.env.SMARTCAR_CLIENT_SECRET &&
      process.env.SMARTCAR_MANAGEMENT_TOKEN &&
      process.env.SMARTCAR_REDIRECT_URI,
  );

  return (
    <main>
      <p className="landing-overline">Oversikt</p>
      <h1>Slik ser bilen ut nå.</h1>
      <p className="panel-lead">
        Panelet samler det bilen deler: batterinivå, rekkevidde og lading.
        Dette er historikk, ikke målt batterihelse.
      </p>

      {smartcarStatus === "connected" ? (
        <p className="panel-notice">Bilen er koblet til. Første data kan bruke noen minutter.</p>
      ) : null}
      {smartcarStatus === "pending" || smartcarStatus === "error" ? (
        <p className="panel-notice panel-notice-warn">
          {reasonMessages[reason ?? ""] ?? "Tilkoblingen ble ikke fullført."}
          {syncSession ? <RetrySmartcarButton sessionId={syncSession} /> : null}
        </p>
      ) : null}

      {vehicle ? (
        <>
          <p className="panel-vehicle">
            {vehicle.make} {vehicle.model} · {vehicle.year}
            <span>
              Sist oppdatert {formatPanelDate(vehicle.last_data_at)}
            </span>
          </p>
          <div className="panel-cards">
            <article>
              <span>Batterinivå</span>
              <strong>
                {formatReading(
                  latestReading(
                    vehicleReadings,
                    "tractionbattery-stateofcharge",
                  ),
                )}
              </strong>
            </article>
            <article>
              <span>Estimert rekkevidde</span>
              <strong>
                {formatReading(
                  latestReading(vehicleReadings, "tractionbattery-range"),
                )}
              </strong>
            </article>
            <article>
              <span>Lading</span>
              <strong>
                {formatReading(
                  latestReading(vehicleReadings, "charge-ischarging"),
                )}
              </strong>
            </article>
            <article>
              <span>Kilometerstand</span>
              <strong>
                {formatReading(
                  latestReading(
                    vehicleReadings,
                    "odometer-traveleddistance",
                  ),
                )}
              </strong>
            </article>
          </div>
        </>
      ) : (
        <section className="panel-empty">
          <h2>Ingen bil er koblet til ennå.</h2>
          <p>
            Koblingen gir bare lesetilgang. Når dataene kommer inn, fylles
            oversiktene her.
          </p>
          {smartcarConfigured ? (
            <ConnectCarButton defaultMode={getSmartcarConnectMode()} />
          ) : (
            <p className="panel-notice panel-notice-warn">
              Smartcar er ikke konfigurert ferdig i dette miljøet.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
