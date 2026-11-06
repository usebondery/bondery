import { prisma } from "@bondery/db";
import type { SyncBootstrapResponse } from "@bondery/schemas/sync";
import { syncBootstrapResponseSchema } from "@bondery/schemas/sync";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { fetchSyncTableRows } from "../../lib/data/prisma-sync.js";
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
        summary: "Bootstrap sync",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      if (!validateSyncProtocolHeaders(request, reply)) {
        return;
      }

      const started = Date.now();
      const { user } = getAuth(request);

      const tables = Object.fromEntries(
        SYNC_TABLE_KEYS.map((table) => [table, [] as Record<string, unknown>[]]),
      ) as SyncBootstrapResponse["tables"];
      let rowCount = 0;

      await Promise.all(
        SYNC_TABLE_KEYS.map(async (table) => {
          const rows = await fetchSyncTableRows(prisma, user.id, table);
          tables[table] = rows;
          rowCount += rows.length;
        }),
      );

      const nextServerSequence = await getLastServerSequence(prisma, user.id);
      const durationMs = Date.now() - started;
      logSyncBootstrap(request.log, { durationMs, nextServerSequence, rowCount, userId: user.id });

      return {
        nextServerSequence,
        tables,
      } satisfies SyncBootstrapResponse;
    },
  );
};
