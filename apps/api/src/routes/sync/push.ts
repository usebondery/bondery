import type { FastifyReply } from "fastify";
import type { AppRoutePlugin } from "../../lib/fastify-types";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { syncPushRequestSchema, syncPushResponseSchema } from "@bondery/schemas/sync";
import type { SyncPushResult } from "@bondery/schemas/sync";
import { getAuth } from "../../lib/auth";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta";
import { withOkResponse } from "../../lib/openapi-route-responses";
import { createAdminClient } from "../../lib/supabase";
import { validateSyncProtocolHeaders } from "../../lib/sync/protocol";
import { applySyncMutation } from "../../lib/sync/apply-mutation";
import {
  findSyncReceipt,
  getLastServerSequence,
  hashSyncMutationPayload,
  storeSyncReceipt,
} from "../../lib/sync/idempotency";

export const syncPushRoutes: AppRoutePlugin = async (fastify): Promise<void> => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Sync"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.post(
    "/push",
    {
      schema: {
        description: "Apply sync mutations from the client device.",
        body: syncPushRequestSchema,
        response: withOkResponse(syncPushResponseSchema, "Sync push results"),
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
