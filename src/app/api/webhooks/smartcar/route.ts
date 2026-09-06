import { requireSmartcarManagementToken } from "@/lib/env";
import {
  getSmartcarVerifyChallenge,
  hashSmartcarChallenge,
  parseSmartcarJson,
  parseSmartcarWebhookEnvelope,
  verifySmartcarSignature,
} from "@/lib/smartcar/webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "Payload er for stor." }, { status: 413 });
  }

  const rawBody = await request.text();

  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "Payload er for stor." }, { status: 413 });
  }

  let managementToken: string;

  try {
    managementToken = requireSmartcarManagementToken();
  } catch (error) {
    console.error("Smartcar webhook er ikke konfigurert", error);
    return Response.json(
      { error: "Webhook er ikke konfigurert." },
      { status: 503 },
    );
  }

  if (
    !verifySmartcarSignature(
      rawBody,
      request.headers.get("sc-signature"),
      managementToken,
    )
  ) {
    return Response.json({ error: "Ugyldig signatur." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = parseSmartcarJson(rawBody);
  } catch {
    return Response.json({ error: "Ugyldig JSON." }, { status: 400 });
  }

  const challenge = getSmartcarVerifyChallenge(payload);

  if (challenge) {
    return Response.json({
      challenge: hashSmartcarChallenge(challenge, managementToken),
    });
  }

  let event;

  try {
    event = parseSmartcarWebhookEnvelope(payload);
  } catch {
    return Response.json(
      { error: "Ugyldig Smartcar-hendelse." },
      { status: 400 },
    );
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("ingest_smartcar_webhook", {
      p_event_id: event.eventId,
      p_event_type: event.eventType,
      p_payload: event,
      p_received_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (result?.processing_error === "vehicle_not_linked") {
      return Response.json(
        { status: "queued", readingCount: 0 },
        { status: 202 },
      );
    }

    if (result?.processing_error) {
      return Response.json(
        { error: "Hendelsen er lagret, men behandlingen feilet." },
        { status: 503 },
      );
    }

    return Response.json({
      status: result?.inserted ? "accepted" : "duplicate",
      readingCount: result?.reading_count ?? 0,
    });
  } catch (error) {
    console.error("Smartcar webhook kunne ikke lagres", {
      eventId: event.eventId,
      eventType: event.eventType,
      error,
    });

    return Response.json(
      { error: "Hendelsen kunne ikke lagres." },
      { status: 503 },
    );
  }
}
