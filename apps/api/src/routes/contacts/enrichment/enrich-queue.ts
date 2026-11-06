/**
 * Contacts — Enrich Queue Routes
 * Manages the LinkedIn enrichment queue (init, next-batch, status, complete/fail, cancel).
 */

import { prisma } from "@bondery/db";
import {
  apiSuccessResponseSchema,
  enrichQueueCountResponseSchema,
  enrichQueueInitBodySchema,
  enrichQueueInitResponseSchema,
  enrichQueueNextBatchResponseSchema,
  enrichQueuePatchBodySchema,
  enrichQueueStatusCountsSchema,
} from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import {
  cancelEnrichQueue,
  getEnrichQueueEligibleCount,
  initEnrichQueue,
  updateEnrichQueueItem,
} from "../../../domains/contacts/enrichment/enrich-queue.js";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

export function registerEnrichQueueRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/enrich-queue/count",
    {
      schema: {
        description: "Count contacts with a LinkedIn handle but no synced LinkedIn profile data.",
        response: withOkResponse(enrichQueueCountResponseSchema, "Eligible enrichment count"),
        summary: "Count queued enrichments",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => getEnrichQueueEligibleCount(ctx)),
  );

  fastify.get(
    "/enrich-queue/status",
    {
      schema: {
        description: "Return enrichment queue item counts grouped by status.",
        response: withOkResponse(enrichQueueStatusCountsSchema, "Enrichment queue status"),
        summary: "Fetch enrichment queue status",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { user } = getAuth(request);

      const rows = await prisma.linkedinEnrichQueue.findMany({
        select: { status: true },
        where: { userId: user.id },
      });

      const counts = { completed: 0, failed: 0, pending: 0 };
      for (const row of rows) {
        if (row.status === "pending" || row.status === "processing") {
          counts.pending++;
        } else if (row.status === "completed") {
          counts.completed++;
        } else if (row.status === "failed") {
          counts.failed++;
        }
      }

      return counts;
    },
  );

  fastify.post(
    "/enrich-queue/init",
    {
      schema: {
        body: enrichQueueInitBodySchema,
        description: "Initialize a new enrichment run for one contact or all eligible contacts.",
        response: withOkResponse(enrichQueueInitResponseSchema, "Enrichment queue initialized"),
        summary: "Start an enrichment run",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: enrichQueueInitBodySchema }, async (ctx, { body }) =>
      initEnrichQueue(ctx, body?.personId),
    ),
  );

  fastify.get(
    "/enrich-queue/next-batch",
    {
      schema: {
        description: "Return the next batch of pending enrichment queue items.",
        response: withOkResponse(enrichQueueNextBatchResponseSchema, "Next enrichment batch"),
        summary: "Fetch the next enrichment batch",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const BATCH_LIMIT = 50;
      const { user } = getAuth(request);

      const queueItems = await prisma.linkedinEnrichQueue.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, personId: true },
        take: BATCH_LIMIT,
        where: { status: "pending", userId: user.id },
      });

      if (queueItems.length === 0) {
        return { items: [] };
      }

      const personIds = queueItems.map((item) => item.personId);

      const [socials, people] = await Promise.all([
        prisma.peopleSocial.findMany({
          select: { handle: true, personId: true },
          where: {
            personId: { in: personIds },
            platform: "linkedin",
            userId: user.id,
          },
        }),
        prisma.people.findMany({
          select: { firstName: true, id: true, lastName: true },
          where: { id: { in: personIds }, userId: user.id },
        }),
      ]);

      const handleMap = new Map(socials.map((row) => [row.personId, row.handle]));
      const nameMap = new Map(
        people.map((person) => [
          person.id,
          { firstName: person.firstName ?? null, lastName: person.lastName ?? null },
        ]),
      );

      return {
        items: queueItems.map((item) => ({
          firstName: nameMap.get(item.personId)?.firstName ?? null,
          lastName: nameMap.get(item.personId)?.lastName ?? null,
          linkedinHandle: handleMap.get(item.personId) ?? null,
          personId: item.personId,
          queueItemId: item.id,
        })),
      };
    },
  );

  fastify.patch(
    "/enrich-queue/:id",
    {
      schema: {
        body: enrichQueuePatchBodySchema,
        description: "Mark an enrichment queue item as completed or failed.",
        params: uuidParamSchema,
        response: withOkResponse(apiSuccessResponseSchema, "Queue item updated"),
        summary: "Update an enrichment item",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: enrichQueuePatchBodySchema, params: uuidParamSchema },
      async (ctx, { body, params }) =>
        updateEnrichQueueItem(ctx, params.id, body.status, body.errorMessage),
    ),
  );

  fastify.delete(
    "/enrich-queue",
    {
      schema: {
        description: "Cancel the enrichment run by deleting pending queue items.",
        response: withOkResponse(apiSuccessResponseSchema, "Enrichment queue cancelled"),
        summary: "Cancel the enrichment run",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => cancelEnrichQueue(ctx)),
  );
}
