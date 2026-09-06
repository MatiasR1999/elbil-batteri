export type PrioritySignal = {
  code: string;
  label: string;
  requiredForGo: boolean;
};

export const PRIORITY_SIGNALS: readonly PrioritySignal[] = [
  {
    code: "tractionbattery-stateofcharge",
    label: "Batteriprosent",
    requiredForGo: true,
  },
  {
    code: "tractionbattery-range",
    label: "Estimert rekkevidde",
    requiredForGo: true,
  },
  {
    code: "odometer-traveleddistance",
    label: "Kilometerstand",
    requiredForGo: true,
  },
  {
    code: "charge-ischarging",
    label: "Ladestatus",
    requiredForGo: true,
  },
  {
    code: "charge-ischargingcableconnected",
    label: "Ladekabel tilkoblet",
    requiredForGo: false,
  },
  {
    code: "charge-wattage",
    label: "Ladeeffekt",
    requiredForGo: false,
  },
  {
    code: "charge-voltage",
    label: "Ladespenning",
    requiredForGo: false,
  },
  {
    code: "charge-amperage",
    label: "Ladestrøm",
    requiredForGo: false,
  },
  {
    code: "charge-energyadded",
    label: "Mottatt energi",
    requiredForGo: false,
  },
  {
    code: "charge-chargerecords",
    label: "Historiske ladeøkter",
    requiredForGo: false,
  },
  {
    code: "tractionbattery-nominalcapacity",
    label: "Nominell batterikapasitet",
    requiredForGo: false,
  },
  {
    code: "motion-currentspeed",
    label: "Hastighet",
    requiredForGo: false,
  },
] as const;
