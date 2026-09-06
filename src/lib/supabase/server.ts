import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  getSupabasePublicEnv,
  requireSupabasePublicEnv,
} from "@/lib/env";

export function isSupabaseConfigured() {
  return getSupabasePublicEnv() !== null;
}

export async function createServerSupabaseClient() {
  const { url, publishableKey } = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });
}
