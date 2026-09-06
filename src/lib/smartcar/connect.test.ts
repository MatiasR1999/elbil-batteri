import { describe, expect, it } from "vitest";

import {
  buildSmartcarConnectUrl,
  generateConnectState,
  hashConnectState,
} from "@/lib/smartcar/connect";

describe("Smartcar Connect", () => {
  it("bygger en v3 Connect-URL uten scopes eller auth code", () => {
    const url = new URL(
      buildSmartcarConnectUrl({
        applicationId: "app-123",
        redirectUri: "https://giret.example/api/smartcar/callback",
        externalId: "b7f94f8f-67fb-4a5f-b29d-0eed16d535a4",
        state: "random-state",
        mode: "simulated",
      }),
    );

    expect(url.origin).toBe("https://connect.smartcar.com");
    expect(url.pathname).toBe("/oauth/authorize");
    expect(url.searchParams.get("application_id")).toBe("app-123");
    expect(url.searchParams.get("response_type")).toBe("none");
    expect(url.searchParams.get("mode")).toBe("simulated");
    expect(url.searchParams.get("scope")).toBeNull();
    expect(url.searchParams.get("external_id")).toBe(
      "b7f94f8f-67fb-4a5f-b29d-0eed16d535a4",
    );
  });

  it("lager uforutsigbar state og lagrer bare hash", () => {
    const first = generateConnectState();
    const second = generateConnectState();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(hashConnectState(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashConnectState(first)).not.toContain(first);
  });

  it("avviser external_id som Smartcar ikke godtar", () => {
    expect(() =>
      buildSmartcarConnectUrl({
        applicationId: "app-123",
        redirectUri: "https://giret.example/api/smartcar/callback",
        externalId: "bruker med mellomrom",
        state: "random-state",
        mode: "live",
      }),
    ).toThrow("ugyldig format");
  });
});
