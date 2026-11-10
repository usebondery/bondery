/**
 * Contacts — Merge Recommendations Routes
 * Lists, refreshes, declines, and restores merge recommendations.
 */

import type {
  MergeRecommendationsResponse,
  RefreshMergeRecommendationsResponse,
} from "@bondery/schemas";
import {
  declineMergeRecommendationResponseSchema,
  mergeRecommendationsCountResponseSchema,
  mergeRecommendationsResponseSchema,
  refreshMergeRecommendationsResponseSchema,
} from "@bondery/schemas";
import { avatarTransformQuerySchema, uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { domainDb } from "../../../domains/_shared/domain-db.js";
import {
  declineMergeRecommendation,
  getMergeRecommendationsCount,
  refreshMergeRecommendations,
  restoreMergeRecommendation,
} from "../../../domains/contacts/merge-recommendations.js";
import { mergeRecommendationsQuerySchema } from "../../../lib/contacts/merge-helpers.js";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  parsePagination,
} from "../../../lib/data/pagination.js";
import { extractAvatarOptions } from "../../../lib/data/select-fragments.js";
import { domainContextFromRequest } from "../../../lib/platform/domain-context.js";
import { internal } from "../../../lib/platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { hydrateMergeRecommendations } from "../../../services/contacts/merge-recommendations.js";

export function registerRecommendationRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/merge-recommendations/count",
    {
      schema: {
        description: "Count active merge recommendations for the current user.",
        response: withOkResponse(
          mergeRecommendationsCountResponseSchema,
          "Merge recommendations count",
        ),
        summary: "Count merge recommendations",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      return getMergeRecommendationsCount(ctx);
    },
  );

  fastify.get(
    "/merge-recommendations",
    {
      schema: {
        description: "List merge recommendations for duplicate contacts.",
        querystring: mergeRecommendationsQuerySchema,
        response: withOkResponse(mergeRecommendationsResponseSchema, "Merge recommendations"),
        summary: "List merge recommendations",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      const db = domainDb(ctx);
      const avatarOptions = extractAvatarOptions(request.query);
      const { limit, offset } = parsePagination(request.query);
      const declinedQuery = request.query?.declined;
      const showDeclined =
        typeof declinedQuery === "boolean"
          ? declinedQuery
          : typeof declinedQuery === "string"
            ? declinedQuery.toLowerCase() === "true"
            : false;

      const where = { isDeclined: showDeclined, userId: ctx.user.id };

      const [recommendationRows, totalCount] = await Promise.all([
        db.peopleMergeRecommendation.findMany({
          orderBy: [{ score: "desc" }, { createdAt: "desc" }, { id: "desc" }],
          select: {
            id: true,
            leftPersonId: true,
            reasons: true,
            rightPersonId: true,
            score: true,
          },
          skip: offset,
          take: limit,
          where,
        }),
        db.peopleMergeRecommendation.count({ where }),
      ]);

      if (recommendationRows.length === 0) {
        const pagination = buildPaginationMeta({
          itemCount: 0,
          limit,
          offset,
          search: null,
          sort: "scoreDesc",
          totalCount,
        });
        return buildPaginatedResponse("recommendations", [], pagination);
      }

      let recommendations: MergeRecommendationsResponse["recommendations"];
      try {
        recommendations = await hydrateMergeRecommendations(
          ctx,
          recommendationRows.map((row) => ({
            id: row.id,
            left_person_id: row.leftPersonId,
            reasons: row.reasons,
            right_person_id: row.rightPersonId,
            score: row.score,
          })),
          avatarOptions,
        );
      } catch (hydrateError) {
        const message =
          hydrateError instanceof Error
            ? hydrateError.message
            : "Failed to load merge recommendations";
        throw internal("internal_server_error", message);
      }

      const pagination = buildPaginationMeta({
        itemCount: recommendations.length,
        limit,
        offset,
        search: null,
        sort: "scoreDesc",
        totalCount,
      });

      return buildPaginatedResponse("recommendations", recommendations, pagination);
    },
  );

  fastify.post(
    "/merge-recommendations/refresh",
    {
      schema: {
        description: "Recompute merge recommendations for the current user.",
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(
          refreshMergeRecommendationsResponseSchema,
          "Merge recommendations refreshed",
        ),
        summary: "Refresh merge recommendations",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      const avatarOptions = extractAvatarOptions(request.query);

      try {
        return (await refreshMergeRecommendations(ctx, {
          avatarOptions,
          hydrate: true,
        })) as RefreshMergeRecommendationsResponse;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to refresh merge recommendations";
        throw internal("internal_server_error", message);
      }
    },
  );

  fastify.patch(
    "/merge-recommendations/:id/decline",
    {
      schema: {
        description: "Decline a merge recommendation.",
        params: uuidParamSchema,
        response: withOkResponse(
          declineMergeRecommendationResponseSchema,
          "Merge recommendation declined",
        ),
        summary: "Decline a merge recommendation",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params }) => {
      const { data } = await declineMergeRecommendation(ctx, params.id);
      return data;
    }),
  );

  fastify.patch(
    "/merge-recommendations/:id/restore",
    {
      schema: {
        description: "Restore a declined merge recommendation.",
        params: uuidParamSchema,
        response: withOkResponse(
          declineMergeRecommendationResponseSchema,
          "Merge recommendation restored",
        ),
        summary: "Restore a merge recommendation",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params }) => {
      const { data } = await restoreMergeRecommendation(ctx, params.id);
      return data;
    }),
  );
}
