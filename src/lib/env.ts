import { z } from "zod";

const urlSchema = z.string().url();
const connectModeSchema = z.enum(["live", "simulated"]);

export type SmartcarConnectMode = z.infer<typeof connectModeSchema>;

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  return {
    url: urlSchema.parse(url),
    publishableKey,
  };
}

export function requireSupabasePublicEnv() {
  const env = getSupabasePublicEnv();

  if (!env) {
    throw new Error(
      "Supabase er ikke konfigurert. Sett NEXT_PUBLIC_SUPABASE_URL og NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return env;
}

export function requireSupabaseAdminEnv() {
  const publicEnv = requireSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Supabase admin-klient mangler SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return {
    ...publicEnv,
    serviceRoleKey,
  };
}

export function getSmartcarConnectMode(): SmartcarConnectMode {
  return connectModeSchema.parse(
    process.env.SMARTCAR_CONNECT_MODE ?? "simulated",
  );
}

export function requireSmartcarConnectEnv() {
  const applicationId = process.env.SMARTCAR_APPLICATION_ID;
  const redirectUri = process.env.SMARTCAR_REDIRECT_URI;

  if (!applicationId || !redirectUri) {
    throw new Error(
      "Smartcar Connect mangler SMARTCAR_APPLICATION_ID eller SMARTCAR_REDIRECT_URI.",
    );
  }

  return {
    applicationId,
    redirectUri: urlSchema.parse(redirectUri),
  };
}

export function requireSmartcarApiEnv() {
  const clientId = process.env.SMARTCAR_CLIENT_ID;
  const clientSecret = process.env.SMARTCAR_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Smartcar API mangler SMARTCAR_CLIENT_ID eller SMARTCAR_CLIENT_SECRET.",
    );
  }

  return { clientId, clientSecret };
}

export function requireSmartcarManagementToken() {
  const token = process.env.SMARTCAR_MANAGEMENT_TOKEN;

  if (!token) {
    throw new Error(
      "Smartcar webhook mangler SMARTCAR_MANAGEMENT_TOKEN.",
    );
  }

  return token;
}
