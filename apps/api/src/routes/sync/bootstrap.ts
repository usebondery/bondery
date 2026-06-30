import type { FastifyReply } from "fastify";
import type { AppRoutePlugin } from "../../lib/fastify-types.js";
import type { SyncBatch, SyncBootstrapResponse } from "@bondery/schemas/sync";
import { getAuth } from "../../lib/auth.js";
import { createAdminClient } from "../../lib/supabase.js";
import { getLastServerSequence } from "../../lib/sync/idempotency.js";
import { logSyncBootstrap } from "../../lib/sync/metrics.js";
import { validateSyncProtocolHeaders } from "../../lib/sync/protocol.js";
import { SYNC_TABLE_KEYS, type SyncTableKey } from "../../lib/sync/sync-tables.js";

export const syncBootstrapRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Sync"];
    }
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.get("/bootstrap", async (request, reply) => {
    if (!validateSyncProtocolHeaders(request, reply)) {
      return;
    }

    const started = Date.now();
    const { user } = getAuth(request);
    const admin = createAdminClient();

    const tables = {} as SyncBootstrapResponse["tables"];
    let rowCount = 0;

    await Promise.all(
      SYNC_TABLE_KEYS.map(async (table) => {
        const { data, error } = await admin
          .from(table)
          .select("*")
          .eq("user_id", user.id);

        if (error) {
          throw new Error(error.message);
        }

        const rows = (data ?? []) as Record<string, unknown>[];
        tables[table as SyncTableKey] = rows;
        rowCount += rows.length;
      }),
    );

    const nextServerSequence = await getLastServerSequence(admin, user.id);
    const durationMs = Date.now() - started;
    logSyncBootstrap(request.log, { userId: user.id, rowCount, nextServerSequence, durationMs });

    return {
      tables,
      nextServerSequence,
    } satisfies SyncBootstrapResponse;
  });
}
