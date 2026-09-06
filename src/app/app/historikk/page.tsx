import {
  formatPanelDate,
  formatReading,
  getPanelOverview,
} from "@/lib/panel/session";

const labels: Record<string, string> = {
  "tractionbattery-stateofcharge": "Batterinivå",
  "tractionbattery-range": "Estimert rekkevidde",
  "odometer-traveleddistance": "Kilometerstand",
  "charge-ischarging": "Lading",
  "charge-ischargingcableconnected": "Ladekabel",
  "charge-wattage": "Ladeeffekt",
};

export default async function HistoryPage() {
  const { vehicles, readings } = await getPanelOverview();
  const vehicle = vehicles[0];
  const rows = vehicle
    ? readings.filter((reading) => reading.vehicle_id === vehicle.id)
    : [];

  return (
    <main>
      <p className="landing-overline">Historikk</p>
      <h1>Utvikling over tid, ikke ett øyeblikk.</h1>
      <p className="panel-lead">
        Her ser du målingene som er registrert. Sammenlign perioder før du
        konkluderer om rekkevidde eller batteri.
      </p>

      {rows.length === 0 ? (
        <section className="panel-empty">
          <h2>Ingen historikk ennå.</h2>
          <p>Når bilen er koblet til, bygges listen opp i bakgrunnen.</p>
        </section>
      ) : (
        <table className="panel-table">
          <thead>
            <tr>
              <th>Tidspunkt</th>
              <th>Måling</th>
              <th>Verdi</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 40).map((reading) => (
              <tr key={reading.id}>
                <td>{formatPanelDate(reading.received_at)}</td>
                <td>{labels[reading.signal_code] ?? reading.signal_code}</td>
                <td>{formatReading(reading)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
