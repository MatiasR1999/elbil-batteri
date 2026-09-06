import { createHash, randomBytes } from "node:crypto";

import type { SmartcarConnectMode } from "@/lib/env";

const SMARTCAR_CONNECT_URL = "https://connect.smartcar.com/oauth/authorize";
const EXTERNAL_ID_PATTERN = /^[a-zA-Z0-9._-]{1,100}$/;

type BuildConnectUrlOptions = {
  applicationId: string;
  redirectUri: string;
  externalId: string;
  state: string;
  mode: SmartcarConnectMode;
};

export function generateConnectState() {
  return randomBytes(32).toString("base64url");
}

export function hashConnectState(state: string) {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

export function buildSmartcarConnectUrl({
  applicationId,
  redirectUri,
  externalId,
  state,
  mode,
}: BuildConnectUrlOptions) {
  if (!EXTERNAL_ID_PATTERN.test(externalId)) {
    throw new Error("Smartcar external_id har ugyldig format.");
  }

  const url = new URL(SMARTCAR_CONNECT_URL);
  url.searchParams.set("application_id", applicationId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "none");
  url.searchParams.set("external_id", externalId);
  url.searchParams.set("state", state);
  url.searchParams.set("mode", mode);

  return url.toString();
}
