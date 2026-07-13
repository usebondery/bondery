import type { SyncBootstrapResponse } from "@bondery/schemas/sync";
import { syncBootstrapResponseSchema } from "@bondery/schemas/sync";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { createAdminClient } from "../../lib/data/supabase.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { getLastServerSequence } from "../../lib/sync/idempotency.js";
import { logSyncBootstrap } from "../../lib/sync/metrics.js";
import { validateSyncProtocolHeaders } from "../../lib/sync/protocol.js";
import { SYNC_TABLE_KEYS } from "../../lib/sync/sync-tables.js";

export const syncBootstrapRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Sync"];
    }
  });

  fastify.get(
    "/bootstrap",
    {
      schema: {
        description:
          "Full sync bootstrap — returns all user tables and the latest server sequence.",
        response: withOkResponse(syncBootstrapResponseSchema, "Sync bootstrap snapshot"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      if (!validateSyncProtocolHeaders(request, reply)) {
        return;
      }

      const started = Date.now();
      const { user } = getAuth(request);
      const admin = createAdminClient();

      const tables = Object.fromEntries(
        SYNC_TABLE_KEYS.map((table) => [table, [] as Record<string, unknown>[]]),
      ) as SyncBootstrapResponse["tables"];
      let rowCount = 0;

      await Promise.all(
        SYNC_TABLE_KEYS.map(async (table) => {
          const { data, error } = await admin.from(table).select("*").eq("user_id", user.id);

          if (error) {
            throw new Error(error.message);
          }

          const rows = (data ?? []) as Record<string, unknown>[];
          tables[table] = rows;
          rowCount += rows.length;
        }),
      );

      const nextServerSequence = await getLastServerSequence(admin, user.id);
      const durationMs = Date.now() - started;
      logSyncBootstrap(request.log, { durationMs, nextServerSequence, rowCount, userId: user.id });

      return {
        nextServerSequence,
        tables,
      } satisfies SyncBootstrapResponse;
    },
  );
};
