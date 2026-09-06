import "server-only";

import { z } from "zod";

import { requireSmartcarApiEnv } from "@/lib/env";

const SMARTCAR_TOKEN_URL = "https://iam.smartcar.com/oauth2/token";
const SMARTCAR_API_URL = "https://vehicle.api.smartcar.com/v3";

const accessTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
  token_type: z.string().optional(),
});

const connectionSchema = z.object({
  id: z.string().min(1),
  attributes: z.object({
    permissions: z.array(z.string()).default([]),
    vehicle: z.object({
      make: z.string(),
      model: z.string(),
      year: z.number().int(),
      mode: z.enum(["live", "simulated"]),
      powertrainType: z.string().optional(),
    }),
    user: z.object({
      id: z.string().min(1),
      externalId: z.string().optional(),
    }),
  }),
  relationships: z.object({
    vehicle: z.object({
      data: z.object({
        id: z.string().min(1),
        type: z.string(),
      }),
    }),
    user: z.object({
      data: z.object({
        id: z.string().min(1),
        type: z.string(),
      }),
    }),
  }),
  meta: z.object({
    createdAt: z.string(),
    updatedAt: z.string().optional(),
  }),
});

const connectionsResponseSchema = z.object({
  data: z.array(connectionSchema),
  meta: z.object({
    pageNumber: z.number().int(),
    pageSize: z.number().int(),
    totalCount: z.number().int(),
  }),
});

export type SmartcarConnection = z.infer<typeof connectionSchema>;

let tokenCache:
  | {
      accessToken: string;
      expiresAt: number;
    }
  | undefined;

async function getApplicationAccessToken() {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret } = requireSmartcarApiEnv();
  const response = await fetch(SMARTCAR_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(
      `Smartcar tokenforespørsel feilet (${response.status}): ${details}`,
    );
  }

  const token = accessTokenSchema.parse(await response.json());
  tokenCache = {
    accessToken: token.access_token,
    expiresAt: now + token.expires_in * 1_000,
  };

  return token.access_token;
}

export async function listSmartcarConnections(smartcarUserId: string) {
  const accessToken = await getApplicationAccessToken();
  const connections: SmartcarConnection[] = [];
  let pageNumber = 1;
  let totalCount = 0;

  do {
    const url = new URL(`${SMARTCAR_API_URL}/connections`);
    url.searchParams.set("filter[userId]", smartcarUserId);
    url.searchParams.set("page[number]", String(pageNumber));
    url.searchParams.set("page[size]", "100");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 500);
      throw new Error(
        `Smartcar connection-forespørsel feilet (${response.status}): ${details}`,
      );
    }

    const page = connectionsResponseSchema.parse(await response.json());
    connections.push(...page.data);
    totalCount = page.meta.totalCount;
    pageNumber += 1;
  } while (connections.length < totalCount);

  return connections;
}
