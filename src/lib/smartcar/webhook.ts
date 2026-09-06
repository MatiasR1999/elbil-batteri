import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const verificationChallengeSchema = z
  .string()
  .min(8)
  .max(512)
  .regex(/^[A-Za-z0-9._~+/=-]+$/);

const webhookMetaSchema = z
  .record(z.string(), z.unknown())
  .optional();

const webhookUserSchema = z
  .object({
    id: z.string().min(1),
    externalId: z.string().min(1).optional(),
  })
  .loose();

const webhookVehicleSchema = z
  .object({
    id: z.string().min(1),
  })
  .loose();

const signalSchema = z
  .object({
    code: z.string().min(1),
    body: z.record(z.string(), z.unknown()).optional(),
    status: z.record(z.string(), z.unknown()).optional(),
  })
  .loose()
  .refine(
    (signal) => signal.body !== undefined || signal.status !== undefined,
    "Signalet må inneholde body eller status.",
  );

const vehicleStateEventSchema = z
  .object({
    eventId: z.string().min(1),
    eventType: z.literal("VEHICLE_STATE"),
    data: z
      .object({
        user: webhookUserSchema,
        vehicle: webhookVehicleSchema,
        signals: z.array(signalSchema),
      })
      .loose(),
    meta: webhookMetaSchema,
  })
  .loose();

const vehicleErrorEventSchema = z
  .object({
    eventId: z.string().min(1),
    eventType: z.literal("VEHICLE_ERROR"),
    data: z
      .object({
        user: webhookUserSchema,
        vehicle: webhookVehicleSchema,
        errors: z.array(
          z
            .object({
              type: z.string().min(1),
              code: z.string().nullable(),
              state: z.enum(["ERROR", "RESOLVED"]),
              signals: z.array(
                z
                  .object({
                    code: z.string().min(1),
                  })
                  .loose(),
              ),
            })
            .loose(),
        ),
      })
      .loose(),
    meta: webhookMetaSchema,
  })
  .loose();

const webhookEnvelopeSchema = z.discriminatedUnion("eventType", [
  vehicleStateEventSchema,
  vehicleErrorEventSchema,
]);

const verifyEventSchema = z
  .object({
    eventType: z.literal("VERIFY"),
    data: z.object({
      challenge: verificationChallengeSchema,
    }),
  })
  .loose();

const legacyVerifyEventSchema = z
  .object({
    eventName: z.literal("verify"),
    payload: z.object({
      challenge: verificationChallengeSchema,
    }),
  })
  .loose();

export type SmartcarWebhookEnvelope = z.infer<typeof webhookEnvelopeSchema>;

export function hashSmartcarChallenge(
  challenge: string,
  managementToken: string,
) {
  return createHmac("sha256", managementToken)
    .update(challenge, "utf8")
    .digest("hex");
}

export function verifySmartcarSignature(
  rawBody: string,
  signature: string | null,
  managementToken: string,
) {
  if (!signature) {
    return false;
  }

  const normalizedSignature = signature
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(normalizedSignature)) {
    return false;
  }

  const expected = Buffer.from(
    hashSmartcarChallenge(rawBody, managementToken),
    "hex",
  );
  const actual = Buffer.from(normalizedSignature, "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function parseSmartcarJson(rawBody: string): unknown {
  return JSON.parse(rawBody) as unknown;
}

export function getSmartcarVerifyChallenge(payload: unknown) {
  const current = verifyEventSchema.safeParse(payload);

  if (current.success) {
    return current.data.data.challenge;
  }

  const legacy = legacyVerifyEventSchema.safeParse(payload);
  return legacy.success ? legacy.data.payload.challenge : null;
}

export function parseSmartcarWebhookEnvelope(payload: unknown) {
  return webhookEnvelopeSchema.parse(payload);
}
