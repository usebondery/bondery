import type { SyncPushResult } from "@bondery/schemas/sync";
import { syncPushRequestSchema, syncPushResponseSchema } from "@bondery/schemas/sync";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { createAdminClient } from "../../lib/data/supabase.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { applySyncMutation } from "../../lib/sync/apply-mutation.js";
import {
  findSyncReceipt,
  getLastServerSequence,
  hashSyncMutationPayload,
  storeSyncReceipt,
} from "../../lib/sync/idempotency.js";
import { validateSyncProtocolHeaders } from "../../lib/sync/protocol.js";

export const syncPushRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Sync"];
    }
  });

  fastify.post(
    "/push",
    {
      schema: {
        body: syncPushRequestSchema,
        description: "Apply sync mutations from the client device.",
        response: withOkResponse(syncPushResponseSchema, "Sync push results"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      if (!validateSyncProtocolHeaders(request, reply)) {
        return;
      }

      const { mutations, deviceId } = request.body;
      const { client, user } = getAuth(request);
      const admin = createAdminClient();
      const ctx = {
        client,
        log: request.log,
        user,
        wakeMeta: { sourceDeviceId: deviceId },
      };

      const sortedMutations = [...mutations].sort((a, b) => a.clientSequence - b.clientSequence);

      const results: SyncPushResult[] = [];

      for (const mutation of sortedMutations) {
        const payloadHash = hashSyncMutationPayload(mutation);
        const existing = await findSyncReceipt(admin, user.id, mutation.id);

        if (existing) {
          if (existing.payload_hash !== payloadHash) {
            results.push({
              error: "Idempotency payload mismatch",
              id: mutation.id,
              status: "rejected",
            });
            continue;
          }

          const stored = existing.result as SyncPushResult;
          results.push({
            ...stored,
            id: mutation.id,
            serverSequence: existing.server_sequence,
            status: "duplicate",
          });
          continue;
        }

        const { result } = await applySyncMutation(ctx, mutation);

        if (result.status === "applied") {
          await storeSyncReceipt(admin, {
            mutationId: mutation.id,
            mutationType: mutation.type,
            payloadHash,
            result,
            serverSequence: result.serverSequence,
            userId: user.id,
          });
        }

        results.push(result);
      }

      const nextServerSequence = await getLastServerSequence(admin, user.id);

      return {
        nextServerSequence,
        results,
        serverTime: new Date().toISOString(),
      };
    },
  );
};
