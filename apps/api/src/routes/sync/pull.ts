import { prisma } from "@bondery/db";
import { syncPullQuerySchema } from "@bondery/schemas/http";
import type { SyncBatch, SyncChange, SyncPullResponse } from "@bondery/schemas/sync";
import { syncPullResponseSchema } from "@bondery/schemas/sync";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { fetchSyncChangeLogRows, type SyncChangeLogRow } from "../../lib/data/prisma-sync.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import { badRequest } from "../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { getLastServerSequence } from "../../lib/sync/idempotency.js";
import { logSyncPull } from "../../lib/sync/metrics.js";
import { validateSyncProtocolHeaders } from "../../lib/sync/protocol.js";
import { isSyncTableKey } from "../../lib/sync/sync-tables.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const MAX_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

function groupRowsIntoBatches(rows: SyncChangeLogRow[]): SyncBatch[] {
  const batchMap = new Map<number, SyncBatch>();

  for (const row of rows) {
    let batch = batchMap.get(row.server_sequence);
    if (!batch) {
      batch = { changes: [], serverSequence: row.server_sequence };
      batchMap.set(row.server_sequence, batch);
    }

    if (!isSyncTableKey(row.table_name)) {
      continue;
    }

    const change: SyncChange = {
      entityId: row.entity_id,
      operation: row.operation,
      table: row.table_name,
      value: row.row_data,
    };
    batch.changes.push(change);
  }

  return Array.from(batchMap.values()).sort((a, b) => a.serverSequence - b.serverSequence);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const syncPullRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Sync"];
    }
  });

  fastify.get(
    "/pull",
    {
      schema: {
        description: "Incremental sync pull — returns change batches since a server sequence.",
        querystring: syncPullQuerySchema,
        response: withOkResponse(syncPullResponseSchema, "Sync change batches"),
        summary: "Pull sync changes",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      if (!validateSyncProtocolHeaders(request, reply)) {
        return;
      }

      const { since, limit: limitParam, waitMs: waitMsParam } = request.query;
      const limit = Math.min(MAX_LIMIT, Math.max(1, limitParam ?? DEFAULT_LIMIT));
      const waitMs = Math.min(MAX_WAIT_MS, Math.max(0, waitMsParam ?? 0));

      if (!Number.isFinite(since) || since < 0) {
        throw badRequest("since must be a non-negative integer", "bad_request");
      }

      const { user } = getAuth(request);
      const head = await getLastServerSequence(prisma, user.id);

      if (since > head) {
        const response: SyncPullResponse = {
          batches: [],
          nextServerSequence: head,
          requiresBootstrap: true,
        };
        return response;
      }

      const deadline = Date.now() + waitMs;
      let rows: SyncChangeLogRow[] = [];

      while (true) {
        rows = await fetchSyncChangeLogRows(prisma, user.id, since, limit);
        if (rows.length > 0 || waitMs === 0 || Date.now() >= deadline) {
          break;
        }
        await sleep(POLL_INTERVAL_MS);
      }

      const batches = groupRowsIntoBatches(rows);
      const lastBatch = batches.at(-1);
      const nextServerSequence = lastBatch?.serverSequence ?? since;

      logSyncPull(request.log, {
        batchCount: batches.length,
        nextServerSequence,
        since,
        userId: user.id,
      });

      return {
        batches,
        nextServerSequence,
      } satisfies SyncPullResponse;
    },
  );
};
