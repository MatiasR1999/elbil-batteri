import "server-only";

import { listSmartcarConnections } from "@/lib/smartcar/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SyncStartRow = {
  giret_user_id: string;
  connect_mode: "live" | "simulated";
};

export type SmartcarSyncResult =
  | { status: "completed"; connectionCount: number }
  | { status: "pending"; connectionCount: 0 };

export async function syncSmartcarConnectSession(
  sessionId: string,
  smartcarUserId: string,
): Promise<SmartcarSyncResult> {
  const admin = createSupabaseAdminClient();
  let phase = "begin_sync";

  try {
    const { data: startData, error: startError } = await admin.rpc(
      "begin_smartcar_connect_sync",
      {
        p_session_id: sessionId,
        p_smartcar_user_id: smartcarUserId,
      },
    );

    if (startError) {
      throw startError;
    }

    const start = (
      Array.isArray(startData) ? startData[0] : startData
    ) as SyncStartRow | null;

    if (!start) {
      throw new Error("Smartcar-synkronisering mangler sesjonsdata.");
    }

    phase = "list_connections";
    const connections = (
      await listSmartcarConnections(smartcarUserId)
    ).filter(
      (connection) =>
        connection.attributes.user.id === smartcarUserId &&
        connection.attributes.user.externalId ===
          start.giret_user_id &&
        connection.attributes.vehicle.mode === start.connect_mode,
    );

    if (connections.length === 0) {
      return { status: "pending", connectionCount: 0 };
    }

    const normalizedConnections = connections.map((connection) => ({
      connectionId: connection.id,
      smartcarVehicleId: connection.relationships.vehicle.data.id,
      externalId: connection.attributes.user.externalId,
      permissions: connection.attributes.permissions,
      make: connection.attributes.vehicle.make,
      model: connection.attributes.vehicle.model,
      year: connection.attributes.vehicle.year,
      powertrainType:
        connection.attributes.vehicle.powertrainType ?? null,
      mode: connection.attributes.vehicle.mode,
      createdAt: connection.meta.createdAt,
      updatedAt: connection.meta.updatedAt ?? null,
    }));

    phase = "finalize_sync";
    const { data: finalizedCount, error: finalizeError } =
      await admin.rpc("finalize_smartcar_connect", {
        p_session_id: sessionId,
        p_smartcar_user_id: smartcarUserId,
        p_connections: normalizedConnections,
      });

    if (finalizeError) {
      throw finalizeError;
    }

    return {
      status: "completed",
      connectionCount:
        typeof finalizedCount === "number"
          ? finalizedCount
          : connections.length,
    };
  } catch (error) {
    await admin
      .from("smartcar_connect_sessions")
      .update({
        sync_status: "failed",
        sync_error: phase,
      })
      .eq("id", sessionId)
      .is("consumed_at", null);

    throw error;
  }
}
