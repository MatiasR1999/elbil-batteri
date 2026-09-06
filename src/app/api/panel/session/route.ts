import { type NextRequest, NextResponse } from "next/server";

import { PANEL_SESSION_COOKIE, PANEL_SESSION_VALUE } from "@/lib/panel/session";

function redirectWithStatus(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const leaving = form.get("intent") === "out";
  const response = redirectWithStatus(request, leaving ? "/login" : "/app");

  if (leaving) {
    response.cookies.delete(PANEL_SESSION_COOKIE);
    return response;
  }

  response.cookies.set(PANEL_SESSION_COOKIE, PANEL_SESSION_VALUE, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
