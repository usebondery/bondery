import type { FastifyReply } from "fastify";
import type { AppRoutePlugin } from "../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { syncPushRequestSchema } from "@bondery/schemas/sync";
import { getAuth } from "../../lib/auth.js";
import { createAdminClient } from "../../lib/supabase.js";
import { validateSyncProtocolHeaders } from "../../lib/sync/protocol.js";
import { applySyncMutation } from "../../lib/sync/apply-mutation.js";
import {
  findSyncReceipt,
  getLastServerSequence,
  hashSyncMutationPayload,
  storeSyncReceipt,
} from "../../lib/sync/idempotency.js";
import type { SyncPushResult } from "@bondery/schemas/sync";

export const syncPushRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Sync"];
    }
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.post(
    "/push",
    {
      schema: {
        body: syncPushRequestSchema,
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      if (!validateSyncProtocolHeaders(request, reply)) {
        return;
      }

      const { mutations } = request.body;
      const { client, user } = getAuth(request);
      const admin = createAdminClient();
      const ctx = { client, user, log: request.log };

      const sortedMutations = [...mutations].sort(
        (a, b) => a.clientSequence - b.clientSequence,
      );

      const results: SyncPushResult[] = [];

      for (const mutation of sortedMutations) {
        const payloadHash = hashSyncMutationPayload(mutation);
        const existing = await findSyncReceipt(admin, user.id, mutation.id);

        if (existing) {
          if (existing.payload_hash !== payloadHash) {
            results.push({
              id: mutation.id,
              status: "rejected",
              error: "Idempotency payload mismatch",
            });
            continue;
          }

          const stored = existing.result as SyncPushResult;
          results.push({
            ...stored,
            id: mutation.id,
            status: "duplicate",
            serverSequence: existing.server_sequence,
          });
          continue;
        }

        const { result } = await applySyncMutation(ctx, mutation);

        if (result.status === "applied") {
          await storeSyncReceipt(admin, {
            userId: user.id,
            mutationId: mutation.id,
            mutationType: mutation.type,
            payloadHash,
            serverSequence: result.serverSequence,
            result,
          });
        }

        results.push(result);
      }

      const nextServerSequence = await getLastServerSequence(admin, user.id);

      return {
        results,
        serverTime: new Date().toISOString(),
        nextServerSequence,
      };
    },
  );
};
