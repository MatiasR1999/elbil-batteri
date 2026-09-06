import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { hashSmartcarChallenge } from "../src/lib/smartcar/webhook";

loadEnvConfig(process.cwd());

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);

const smartcarUserId = args.get("user");
const smartcarVehicleId = args.get("vehicle");
const managementToken = process.env.SMARTCAR_MANAGEMENT_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const targetUrl =
  args.get("url") ??
  `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/webhooks/smartcar`;
const target = new URL(targetUrl);

if (!smartcarUserId || !smartcarVehicleId) {
  throw new Error(
    "Bruk --user=<smartcar-user-id> og --vehicle=<smartcar-vehicle-id>.",
  );
}

if (!managementToken || !supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "SMARTCAR_MANAGEMENT_TOKEN, NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY må være satt.",
  );
}

if (
  target.hostname !== "localhost" &&
  target.hostname !== "127.0.0.1" &&
  args.get("allow-remote") !== "true"
) {
  throw new Error(
    "Testscriptet sender bare til localhost. Bruk --allow-remote=true eksplisitt for et testmiljø.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
const { data: connection, error: connectionError } = await supabase
  .from("vehicle_connections")
  .select("vehicle_id")
  .eq("smartcar_user_id", smartcarUserId)
  .single();

if (connectionError || !connection) {
  throw new Error("Fant ikke lokal Smartcar-tilkobling for oppgitt bruker.");
}

const { data: vehicle, error: vehicleError } = await supabase
  .from("vehicles")
  .select("user_id,make,model,year,smartcar_mode")
  .eq("id", connection.vehicle_id)
  .eq("smartcar_vehicle_id", smartcarVehicleId)
  .single();

if (vehicleError || !vehicle) {
  throw new Error("Fant ikke lokalt kjøretøy for oppgitt Smartcar-ID.");
}

const timestamp = Date.now();
const rawBody = JSON.stringify({
  eventId: randomUUID(),
  eventType: "VEHICLE_STATE",
  data: {
    user: {
      id: smartcarUserId,
      externalId: vehicle.user_id,
    },
    vehicle: {
      id: smartcarVehicleId,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      mode: vehicle.smartcar_mode,
      powertrainType: "BEV",
    },
    triggers: [
      {
        code: "tractionbattery-stateofcharge",
        name: "StateOfCharge",
        group: "TractionBattery",
      },
    ],
    signals: [
      {
        code: "tractionbattery-stateofcharge",
        name: "StateOfCharge",
        group: "TractionBattery",
        body: {
          unit: "percent",
          value: 78,
        },
        status: {
          value: "SUCCESS",
        },
        meta: {
          oemUpdatedAt: timestamp - 2_000,
          retrievedAt: timestamp - 1_000,
        },
      },
      {
        code: "tractionbattery-range",
        name: "Range",
        group: "TractionBattery",
        body: {
          unit: "km",
          value: 312.4,
        },
        status: {
          value: "SUCCESS",
        },
        meta: {
          oemUpdatedAt: timestamp - 2_000,
          retrievedAt: timestamp - 1_000,
        },
      },
      {
        code: "odometer-traveleddistance",
        name: "TraveledDistance",
        group: "Odometer",
        body: {
          unit: "km",
          value: 42_150.7,
        },
        status: {
          value: "SUCCESS",
        },
        meta: {
          oemUpdatedAt: timestamp - 2_000,
          retrievedAt: timestamp - 1_000,
        },
      },
      {
        code: "charge-ischarging",
        name: "IsCharging",
        group: "Charge",
        body: {
          value: false,
        },
        status: {
          value: "SUCCESS",
        },
        meta: {
          oemUpdatedAt: timestamp - 2_000,
          retrievedAt: timestamp - 1_000,
        },
      },
    ],
  },
  meta: {
    version: "4.0",
    deliveryId: randomUUID(),
    deliveredAt: timestamp,
    webhookId: randomUUID(),
    webhookName: "Giret local test",
    signalCount: 4,
    mode: "TEST",
  },
});

const response = await fetch(target, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "SC-Signature": hashSmartcarChallenge(rawBody, managementToken),
  },
  body: rawBody,
});

console.log(`${response.status} ${response.statusText}`);
console.log(await response.text());

if (!response.ok) {
  process.exitCode = 1;
}
