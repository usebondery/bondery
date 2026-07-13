import { syncPullQuerySchema } from "@bondery/schemas/http";
import type { SyncBatch, SyncChange, SyncPullResponse } from "@bondery/schemas/sync";
import { syncPullResponseSchema } from "@bondery/schemas/sync";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { createAdminClient } from "../../lib/data/supabase.js";
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

type ChangeLogRow = {
  server_sequence: number;
  change_index: number;
  table_name: string;
  operation: "insert" | "update" | "delete";
  entity_id: string;
  row_data: Record<string, unknown> | null;
};

function groupRowsIntoBatches(rows: ChangeLogRow[]): SyncBatch[] {
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

async function fetchChangeRows(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  since: number,
  limit: number,
): Promise<ChangeLogRow[]> {
  const { data, error } = await admin
    .from("sync_change_log")
    .select("server_sequence, change_index, table_name, operation, entity_id, row_data")
    .eq("user_id", userId)
    .gt("server_sequence", since)
    .order("server_sequence", { ascending: true })
    .order("change_index", { ascending: true })
    .limit(limit * 20);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ChangeLogRow[];
  const sequences = new Set<number>();
  const filtered: ChangeLogRow[] = [];

  for (const row of rows) {
    if (!sequences.has(row.server_sequence)) {
      if (sequences.size >= limit) {
        break;
      }
      sequences.add(row.server_sequence);
    }

    if (sequences.has(row.server_sequence)) {
      filtered.push(row);
    }
  }

  return filtered;
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
      const admin = createAdminClient();
      const head = await getLastServerSequence(admin, user.id);

      if (since > head) {
        const response: SyncPullResponse = {
          batches: [],
          nextServerSequence: head,
          requiresBootstrap: true,
        };
        return response;
      }

      const deadline = Date.now() + waitMs;
      let rows: ChangeLogRow[] = [];

      while (true) {
        rows = await fetchChangeRows(admin, user.id, since, limit);
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
