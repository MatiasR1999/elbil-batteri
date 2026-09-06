import { NextResponse } from "next/server";

import { hashConnectState } from "@/lib/smartcar/connect";
import { syncSmartcarConnectSession } from "@/lib/smartcar/sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function redirectAfterConnect(request: Request, params: Record<string, string>) {
  const url = new URL("/app", request.url);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const callbackUrl = new URL(request.url);
  const state = callbackUrl.searchParams.get("state");

  if (!state || state.length > 256) {
    return redirectAfterConnect(request, {
      smartcar: "error",
      reason: "invalid_state",
    });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: session, error: sessionError } = await admin
    .from("smartcar_connect_sessions")
    .select("id,user_id,mode")
    .eq("state_hash", hashConnectState(state))
    .is("consumed_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  if (sessionError || !session) {
    console.error("Smartcar callback mottok ugyldig state", sessionError);
    return redirectAfterConnect(request, {
      smartcar: "error",
      reason: "expired_state",
    });
  }

  const smartcarError = callbackUrl.searchParams.get("error");

  if (smartcarError) {
    await admin
      .from("smartcar_connect_sessions")
      .update({
        sync_status: "failed",
        sync_error: smartcarError.slice(0, 80),
        consumed_at: now,
      })
      .eq("id", session.id)
      .is("consumed_at", null);

    return redirectAfterConnect(request, {
      smartcar: "error",
      reason: smartcarError.slice(0, 80),
    });
  }

  const smartcarUserId = callbackUrl.searchParams.get("user_id");
  const externalId = callbackUrl.searchParams.get("external_id");

  if (
    !smartcarUserId ||
    !externalId ||
    externalId !== session.user_id
  ) {
    await admin
      .from("smartcar_connect_sessions")
      .update({
        sync_status: "failed",
        sync_error: "identity_mismatch",
        consumed_at: now,
      })
      .eq("id", session.id)
      .is("consumed_at", null);

    return redirectAfterConnect(request, {
      smartcar: "error",
      reason: "identity_mismatch",
    });
  }

  try {
    const result = await syncSmartcarConnectSession(
      session.id,
      smartcarUserId,
    );

    if (result.status === "pending") {
      return redirectAfterConnect(request, {
        smartcar: "pending",
        reason: "connection_not_visible_yet",
        session: session.id,
      });
    }

    return redirectAfterConnect(request, {
      smartcar: "connected",
      count: String(result.connectionCount),
    });
  } catch (error) {
    console.error("Smartcar callback feilet", error);
    return redirectAfterConnect(request, {
      smartcar: "error",
      reason: "sync_failed",
      session: session.id,
    });
  }
}
