import { describe, expect, it } from "vitest";

import {
  getSmartcarVerifyChallenge,
  hashSmartcarChallenge,
  parseSmartcarWebhookEnvelope,
  verifySmartcarSignature,
} from "@/lib/smartcar/webhook";

const managementToken = "test-management-token";

describe("Smartcar webhook-sikkerhet", () => {
  it("hasher VERIFY-utfordringen med HMAC-SHA256", () => {
    expect(hashSmartcarChallenge("challenge", managementToken)).toBe(
      "7720ebc7c5bd92fa6d8ae9b29290cb21957d37254cb1c44549df72df8473598f",
    );
  });

  it("verifiserer signaturen mot helt urørt request body", () => {
    const rawBody = '{"eventId":"event-1","eventType":"VEHICLE_STATE","data":{}}';
    const signature = hashSmartcarChallenge(rawBody, managementToken);

    expect(
      verifySmartcarSignature(rawBody, signature, managementToken),
    ).toBe(true);
    expect(
      verifySmartcarSignature(`${rawBody}\n`, signature, managementToken),
    ).toBe(false);
  });

  it("avviser manglende og feilformaterte signaturer", () => {
    expect(
      verifySmartcarSignature("{}", null, managementToken),
    ).toBe(false);
    expect(
      verifySmartcarSignature("{}", "not-hex", managementToken),
    ).toBe(false);
  });

  it("leser både dagens og eldre VERIFY-format", () => {
    expect(
      getSmartcarVerifyChallenge({
        eventType: "VERIFY",
        data: { challenge: "current-challenge" },
      }),
    ).toBe("current-challenge");
    expect(
      getSmartcarVerifyChallenge({
        eventName: "verify",
        payload: { challenge: "legacy-challenge" },
      }),
    ).toBe("legacy-challenge");
  });

  it("avviser VERIFY-verdier som kan brukes som HMAC-orakel for JSON", () => {
    expect(
      getSmartcarVerifyChallenge({
        eventType: "VERIFY",
        data: {
          challenge:
            '{"eventId":"forged","eventType":"VEHICLE_STATE","data":{}}',
        },
      }),
    ).toBeNull();
  });

  it("krever eventId, eventType og data for vanlige hendelser", () => {
    expect(
      parseSmartcarWebhookEnvelope({
        eventId: "event-1",
        eventType: "VEHICLE_STATE",
        data: {
          user: { id: "smartcar-user-1" },
          vehicle: { id: "smartcar-vehicle-1" },
          signals: [],
        },
      }).eventId,
    ).toBe("event-1");

    expect(() =>
      parseSmartcarWebhookEnvelope({
        eventType: "VEHICLE_STATE",
        data: {},
      }),
    ).toThrow();
  });

  it("validerer signalfeil og VEHICLE_ERROR-tilstander", () => {
    expect(
      parseSmartcarWebhookEnvelope({
        eventId: "event-2",
        eventType: "VEHICLE_STATE",
        data: {
          user: { id: "smartcar-user-1" },
          vehicle: { id: "smartcar-vehicle-1" },
          signals: [
            {
              code: "tractionbattery-range",
              status: {
                value: "ERROR",
                error: {
                  type: "COMPATIBILITY",
                  code: "VEHICLE_NOT_CAPABLE",
                },
              },
            },
          ],
        },
      }).eventType,
    ).toBe("VEHICLE_STATE");

    expect(() =>
      parseSmartcarWebhookEnvelope({
        eventId: "event-3",
        eventType: "VEHICLE_ERROR",
        data: {
          user: { id: "smartcar-user-1" },
          vehicle: { id: "smartcar-vehicle-1" },
          errors: [
            {
              type: "VEHICLE_STATE",
              code: "UNREACHABLE",
              state: "UNKNOWN",
              signals: [],
            },
          ],
        },
      }),
    ).toThrow();
  });
});
