import "server-only";

import { cookies } from "next/headers";

import {
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const PANEL_SESSION_COOKIE = "giret_panel";
export const PANEL_SESSION_VALUE = "in";
export const PANEL_GUEST_EMAIL = "Deg";

const demoVehicle: PanelVehicle = {
  id: "demo-vehicle",
  make: "Volkswagen",
  model: "ID.4",
  year: 2023,
  smartcar_mode: "simulated",
  connected_at: "2025-03-12T08:12:00.000Z",
  last_data_at: "2026-09-06T07:42:00.000Z",
};

const demoReadings: PanelReading[] = [
  {
    id: 4,
    vehicle_id: "demo-vehicle",
    signal_code: "tractionbattery-stateofcharge",
    numeric_value: 78,
    text_value: null,
    boolean_value: null,
    unit: "%",
    received_at: "2026-09-06T07:42:00.000Z",
    quality_status: "ok",
  },
  {
    id: 3,
    vehicle_id: "demo-vehicle",
    signal_code: "tractionbattery-range",
    numeric_value: 328,
    text_value: null,
    boolean_value: null,
    unit: "km",
    received_at: "2026-09-06T07:42:00.000Z",
    quality_status: "ok",
  },
  {
    id: 2,
    vehicle_id: "demo-vehicle",
    signal_code: "charge-ischarging",
    numeric_value: null,
    text_value: null,
    boolean_value: false,
    unit: null,
    received_at: "2026-09-06T07:42:00.000Z",
    quality_status: "ok",
  },
  {
    id: 1,
    vehicle_id: "demo-vehicle",
    signal_code: "odometer-traveleddistance",
    numeric_value: 42180,
    text_value: null,
    boolean_value: null,
    unit: "km",
    received_at: "2026-09-06T07:40:00.000Z",
    quality_status: "ok",
  },
];

export type PanelVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  smartcar_mode: "live" | "simulated";
  connected_at: string;
  last_data_at: string | null;
};

export type PanelReading = {
  id: number;
  vehicle_id: string;
  signal_code: string;
  numeric_value: number | string | null;
  text_value: string | null;
  boolean_value: boolean | null;
  unit: string | null;
  received_at: string;
  quality_status: string;
};

async function hasPanelCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(PANEL_SESSION_COOKIE)?.value === PANEL_SESSION_VALUE;
}

export async function getPanelUser() {
  if (await hasPanelCookie()) {
    return {
      configured: true,
      email: PANEL_GUEST_EMAIL,
      userId: "panel-guest",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      email: undefined as string | undefined,
      userId: undefined as string | undefined,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    configured: true,
    email: user?.email,
    userId: user?.id,
  };
}

export async function getPanelOverview() {
  const session = await getPanelUser();

  if (session.userId === "panel-guest") {
    return {
      ...session,
      vehicles: [demoVehicle],
      readings: demoReadings,
    };
  }

  if (!session.userId || !isSupabaseConfigured()) {
    return {
      ...session,
      vehicles: [] as PanelVehicle[],
      readings: [] as PanelReading[],
    };
  }

  const supabase = await createServerSupabaseClient();
  const [vehicleResult, readingResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id,make,model,year,smartcar_mode,connected_at,last_data_at")
      .order("connected_at", { ascending: false }),
    supabase
      .from("vehicle_signal_readings")
      .select(
        "id,vehicle_id,signal_code,numeric_value,text_value,boolean_value,unit,received_at,quality_status",
      )
      .order("received_at", { ascending: false })
      .limit(80),
  ]);

  return {
    ...session,
    vehicles: (vehicleResult.data ?? []) as PanelVehicle[],
    readings: (readingResult.data ?? []) as PanelReading[],
  };
}

export function latestReading(readings: PanelReading[], signalCode: string) {
  return readings.find((reading) => reading.signal_code === signalCode);
}

export function formatPanelDate(value: string | null) {
  if (!value) {
    return "Ingen data ennå";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatReading(reading: PanelReading | undefined) {
  if (!reading) {
    return "Mangler";
  }

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
