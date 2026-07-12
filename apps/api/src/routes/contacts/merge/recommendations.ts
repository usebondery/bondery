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
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import { domainContextFromClient } from "../../../lib/platform/domain-context.js";
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
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      return getMergeRecommendationsCount(domainContextFromClient(client, user, request.log));
    },
  );

  fastify.get(
    "/merge-recommendations",
    {
      schema: {
        description: "List merge recommendations for duplicate contacts.",
        querystring: mergeRecommendationsQuerySchema,
        response: withOkResponse(mergeRecommendationsResponseSchema, "Merge recommendations"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const avatarOptions = extractAvatarOptions(request.query);
      const { limit, offset } = parsePagination(request.query);
      const declinedQuery = request.query?.declined;
      const showDeclined =
        typeof declinedQuery === "boolean"
          ? declinedQuery
          : typeof declinedQuery === "string"
            ? declinedQuery.toLowerCase() === "true"
            : false;

      const {
        data: recommendationRows,
        error: recommendationsError,
        count,
      } = await client
        .from("people_merge_recommendations")
        .select("id, left_person_id, right_person_id, score, reasons", { count: "exact" })
        .eq("user_id", user.id)
        .eq("is_declined", showDeclined)
        .order("score", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (recommendationsError) {
        throw internal("internal_server_error", recommendationsError.message);
      }

      const totalCount = typeof count === "number" ? count : (recommendationRows || []).length;

      if (!recommendationRows || recommendationRows.length === 0) {
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
          client,
          user.id,
          recommendationRows || [],
          avatarOptions,
          fastify.log,
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
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const avatarOptions = extractAvatarOptions(request.query);

      try {
        return (await refreshMergeRecommendations(
          domainContextFromClient(client, user, request.log),
          { avatarOptions, hydrate: true },
        )) as RefreshMergeRecommendationsResponse;
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
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      const { data } = await declineMergeRecommendation(ctx, request.params.id);
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
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      const { data } = await restoreMergeRecommendation(ctx, request.params.id);
      return data;
    }),
  );
}
