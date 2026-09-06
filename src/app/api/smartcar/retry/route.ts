import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { syncSmartcarConnectSession } from "@/lib/smartcar/sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createRouteSupabaseClient } from "@/lib/supabase/route";

export const runtime = "nodejs";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
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
      { error: "Du må være logget inn for å prøve synkronisering på nytt." },
      { status: 401 },
    );
  }

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return respond(
      { error: "Ugyldig synkroniseringsforespørsel." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: session, error: sessionError } = await admin
    .from("smartcar_connect_sessions")
    .select("id,smartcar_user_id")
    .eq("id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (sessionError || !session?.smartcar_user_id) {
    return respond(
      { error: "Synkroniseringsforsøket finnes ikke eller er utløpt." },
      { status: 404 },
    );
  }

  try {
    const result = await syncSmartcarConnectSession(
      session.id,
      session.smartcar_user_id,
    );

    if (result.status === "pending") {
      return respond(
        {
          status: "pending",
          message: "Smartcar har ikke publisert tilkoblingen ennå.",
        },
        { status: 202 },
      );
    }

    return respond({
      status: "completed",
      connectionCount: result.connectionCount,
    });
  } catch (error) {
    console.error("Smartcar-synkronisering kunne ikke prøves på nytt", error);
    return respond(
      { error: "Synkroniseringen feilet. Prøv igjen om litt." },
      { status: 503 },
    );
  }
}
