import { z } from "zod";
import { type NextRequest, NextResponse } from "next/server";

import {
  getSmartcarConnectMode,
  requireSmartcarConnectEnv,
} from "@/lib/env";
import {
  buildSmartcarConnectUrl,
  generateConnectState,
  hashConnectState,
} from "@/lib/smartcar/connect";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createRouteSupabaseClient } from "@/lib/supabase/route";

export const runtime = "nodejs";

const requestSchema = z.object({
  mode: z.enum(["live", "simulated"]).optional(),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "Ugyldig request-origin." },
      { status: 403 },
    );
  }

  const { supabase, applyToResponse } =
    createRouteSupabaseClient(request);
  const respond = (body: unknown, init?: ResponseInit) =>
    applyToResponse(NextResponse.json(body, init));
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return respond(
      { error: "Du må være logget inn for å koble til en bil." },
      { status: 401 },
    );
  }

  let input: z.infer<typeof requestSchema>;

  try {
    const body = await request.json().catch(() => ({}));
    input = requestSchema.parse(body);
  } catch {
    return respond(
      { error: "Ugyldig forespørsel." },
      { status: 400 },
    );
  }

  let applicationId: string;
  let redirectUri: string;
  let mode: ReturnType<typeof getSmartcarConnectMode>;

  try {
    ({ applicationId, redirectUri } = requireSmartcarConnectEnv());
    mode = input.mode ?? getSmartcarConnectMode();
  } catch (error) {
    console.error("Smartcar Connect mangler konfigurasjon", error);
    return respond(
      { error: "Smartcar Connect er ikke ferdig konfigurert." },
      { status: 503 },
    );
  }

  const state = generateConnectState();
  const admin = createSupabaseAdminClient();

  try {
    const { error: insertError } = await admin
      .from("smartcar_connect_sessions")
      .insert({
        user_id: user.id,
        state_hash: hashConnectState(state),
        mode,
        expires_at: new Date(Date.now() + 10 * 60 * 1_000).toISOString(),
      });

    if (insertError) {
      throw insertError;
    }

    return respond({
      url: buildSmartcarConnectUrl({
        applicationId,
        redirectUri,
        externalId: user.id,
        state,
        mode,
      }),
    });
  } catch (error) {
    const reference = crypto.randomUUID();
    console.error("Kunne ikke opprette Smartcar Connect-sesjon", {
      reference,
      error,
    });
    return respond(
      {
        error: `Smartcar Connect kunne ikke startes. Referanse: ${reference}`,
      },
      { status: 503 },
    );
  }
}
