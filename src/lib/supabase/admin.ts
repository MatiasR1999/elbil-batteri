import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAdminEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = requireSupabaseAdminEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
