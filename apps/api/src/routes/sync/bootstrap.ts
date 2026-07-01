import type { FastifyReply } from "fastify";
import type { AppRoutePlugin } from "../../lib/fastify-types";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type { SyncBatch, SyncBootstrapResponse } from "@bondery/schemas/sync";
import { syncBootstrapResponseSchema } from "@bondery/schemas/sync";
import { getAuth } from "../../lib/auth";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta";
import { withOkResponse } from "../../lib/openapi-route-responses";
import { createAdminClient } from "../../lib/supabase";
import { getLastServerSequence } from "../../lib/sync/idempotency";
import { logSyncBootstrap } from "../../lib/sync/metrics";
import { validateSyncProtocolHeaders } from "../../lib/sync/protocol";
import { SYNC_TABLE_KEYS, type SyncTableKey } from "../../lib/sync/sync-tables";

export const syncBootstrapRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Sync"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.get(
    "/bootstrap",
    {
      schema: {
        description: "Full sync bootstrap — returns all user tables and the latest server sequence.",
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
