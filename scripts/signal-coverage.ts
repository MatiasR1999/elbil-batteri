import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { PRIORITY_SIGNALS } from "../src/lib/smartcar/signals";

loadEnvConfig(process.cwd());

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  smartcar_mode: "live" | "simulated";
};

type Coverage = {
  signal_code: string;
  reading_count: number;
  successful_reading_count: number;
  distinct_oem_observation_count: number;
  error_reading_count: number;
  first_received_at: string | null;
  last_received_at: string | null;
  first_oem_updated_at: string | null;
  last_oem_updated_at: string | null;
  average_interval_seconds: number | string | null;
};

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);

const requestedVehicleId = args.get("vehicle");
const days = Number(args.get("days") ?? 7);

if (!Number.isFinite(days) || days <= 0 || days > 90) {
  throw new Error("--days må være et tall mellom 1 og 90.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Sett NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY før rapporten kjøres.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const periodEnd = new Date();
const periodStart = new Date(periodEnd.getTime() - days * 24 * 60 * 60 * 1_000);

let vehicleQuery = supabase
  .from("vehicles")
  .select("id,make,model,year,smartcar_mode")
  .order("connected_at");

if (requestedVehicleId) {
  vehicleQuery = vehicleQuery.eq("id", requestedVehicleId);
}

const { data: vehicleData, error: vehicleError } = await vehicleQuery;

if (vehicleError) {
  throw vehicleError;
}

const vehicles = (vehicleData ?? []) as Vehicle[];

if (vehicles.length === 0) {
  throw new Error("Ingen kjøretøy matcher rapportfilteret.");
}

console.log("# Giret signalrapport");
console.log("");
console.log(
  `Periode: ${periodStart.toISOString()} – ${periodEnd.toISOString()} (${days} døgn)`,
);
console.log(`Generert: ${new Date().toISOString()}`);

for (const vehicle of vehicles) {
  const [
    { data: coverageData, error: coverageError },
    { count: eventCount, error: eventError },
    { count: failedEventCount, error: failedEventError },
  ] = await Promise.all([
    supabase.rpc("get_signal_coverage_report", {
      p_vehicle_id: vehicle.id,
      p_period_start: periodStart.toISOString(),
      p_period_end: periodEnd.toISOString(),
    }),
    supabase
      .from("raw_smartcar_events")
      .select("event_id", { count: "exact", head: true })
      .eq("vehicle_id", vehicle.id)
      .gte("received_at", periodStart.toISOString())
      .lt("received_at", periodEnd.toISOString()),
    supabase
      .from("raw_smartcar_events")
      .select("event_id", { count: "exact", head: true })
      .eq("vehicle_id", vehicle.id)
      .gte("received_at", periodStart.toISOString())
      .lt("received_at", periodEnd.toISOString())
      .not("processing_error", "is", null),
  ]);

  if (coverageError || eventError || failedEventError) {
    throw coverageError ?? eventError ?? failedEventError;
  }

  const coverage = (coverageData ?? []) as Coverage[];
  const coverageByCode = new Map(
    coverage.map((row) => [row.signal_code, row]),
  );
  const observedTimes = coverage.flatMap((row) =>
    row.first_oem_updated_at && row.last_oem_updated_at
      ? [
          new Date(row.first_oem_updated_at).getTime(),
          new Date(row.last_oem_updated_at).getTime(),
        ]
      : [],
  );
  const observedSpanDays =
    observedTimes.length > 1
      ? (Math.max(...observedTimes) - Math.min(...observedTimes)) /
        (24 * 60 * 60 * 1_000)
      : 0;
  const requiredSignalsPass = PRIORITY_SIGNALS.filter(
    (signal) => signal.requiredForGo,
  ).every(
    (signal) =>
      (coverageByCode.get(signal.code)?.distinct_oem_observation_count ?? 0) >=
      2,
  );
  const preliminaryGo =
    requiredSignalsPass &&
    observedSpanDays >= Math.min(days - 1, 6) &&
    (failedEventCount ?? 0) === 0;

  console.log("");
  console.log(`## ${vehicle.make} ${vehicle.model} (${vehicle.year})`);
  console.log(`Miljø: ${vehicle.smartcar_mode}`);
  console.log(
    `Webhooker: ${eventCount ?? 0} mottatt, ${failedEventCount ?? 0} med behandlingsfeil`,
  );
  console.log(`Observert spenn: ${observedSpanDays.toFixed(1)} døgn`);
  console.log("");

  for (const signal of PRIORITY_SIGNALS) {
    const row = coverageByCode.get(signal.code);
    const successCount = row?.successful_reading_count ?? 0;
    const observationCount = row?.distinct_oem_observation_count ?? 0;
    const status =
      observationCount > 0
        ? "OK"
        : row
          ? "UTILGJENGELIG"
          : "IKKE OBSERVERT";
    const averageInterval = Number(row?.average_interval_seconds);
    const intervalText = Number.isFinite(averageInterval)
      ? `, gjennomsnitt ${Math.round(averageInterval / 60)} min`
      : "";

    console.log(
      `- [${status}] ${signal.label} (${signal.code}): ${observationCount} unike OEM-målinger, ${successCount} vellykkede leveranser av ${row?.reading_count ?? 0}${intervalText}`,
    );
  }

  console.log("");
  console.log(
    preliminaryGo
      ? "Foreløpig signalgate: GO – gjennomgå likevel rådata og OEM-ferskhet manuelt."
      : "Foreløpig signalgate: NO-GO / utilstrekkelig grunnlag – samle mer data eller undersøk manglende kjernesignaler.",
  );
}
