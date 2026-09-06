import {
  formatPanelDate,
  formatReading,
  getPanelOverview,
  latestReading,
} from "@/lib/panel/session";

export default async function ReportPage() {
  const { vehicles, readings } = await getPanelOverview();
  const vehicle = vehicles[0];
  const vehicleReadings = vehicle
    ? readings.filter((reading) => reading.vehicle_id === vehicle.id)
    : [];

  return (
    <main>
      <p className="landing-overline">Salgsrapport</p>
      <h1>Det du kan vise når bilen skal vurderes.</h1>
      <p className="panel-lead">
        Rapporten er historikk med tydelig periode. Den erstatter ikke en
        uavhengig batterikontroll.
      </p>

      {vehicle ? (
        <article className="panel-report">
          <header>
            <strong>
              {vehicle.make} {vehicle.model}
            </strong>
            <span>{vehicle.year}</span>
          </header>
          <dl>
            <div>
              <dt>Tilkoblet</dt>
              <dd>{formatPanelDate(vehicle.connected_at)}</dd>
            </div>
            <div>
              <dt>Siste oppdatering</dt>
              <dd>{formatPanelDate(vehicle.last_data_at)}</dd>
            </div>
            <div>
              <dt>Batterinivå sist</dt>
              <dd>
                {formatReading(
                  latestReading(
                    vehicleReadings,
                    "tractionbattery-stateofcharge",
                  ),
                )}
              </dd>
            </div>
            <div>
              <dt>Rekkevidde sist</dt>
              <dd>
                {formatReading(
                  latestReading(vehicleReadings, "tractionbattery-range"),
                )}
              </dd>
            </div>
            <div>
              <dt>Registrerte målinger</dt>
              <dd>{vehicleReadings.length}</dd>
            </div>
          </dl>
          <p>Dette er historikk, ikke målt batterihelse (SoH).</p>
        </article>
      ) : (
        <section className="panel-empty">
          <h2>Ingen rapport å vise ennå.</h2>
          <p>Kobler du til bilen, kan du dele det som faktisk er registrert.</p>
        </section>
      )}
    </main>
  );
}
