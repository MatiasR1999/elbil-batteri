import { type NextRequest, NextResponse } from "next/server";

import { createRouteSupabaseClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/app";

  if (!code) {
    requestUrl.pathname = "/login";
    requestUrl.search = "?auth=missing_code";
    return NextResponse.redirect(requestUrl);
  }

  const { supabase, applyToResponse } =
    createRouteSupabaseClient(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  requestUrl.pathname = safeNext;
  requestUrl.search = error ? "?auth=error" : "?auth=confirmed";

  return applyToResponse(NextResponse.redirect(requestUrl));
}
