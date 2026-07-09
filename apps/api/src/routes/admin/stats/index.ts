/**
 * Stats API Routes (admin-only)
 * Provides KPI data for the internal dashboard.
 */

import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { serviceUnavailable } from "../../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import {
  activeUsersQuerySchema,
  activeUsersResponseSchema,
  fetchActiveUsersTimeline,
  fetchFunnelPeriods,
  fetchGithubStars,
  fetchNpsResults,
  fetchTotalUsersGrowth,
  funnelResponseSchema,
  githubStarsResponseSchema,
  npsResponseSchema,
  totalUsersResponseSchema,
} from "../../../services/admin/stats.js";

export const statsRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.config = { ...routeOptions.config, rateLimit: false };
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Stats"];
    }
  });

  fastify.get(
    "/active-users",
    {
      schema: {
        description: "Returns DAU/WAU/MAU timeline from PostHog.",
        querystring: activeUsersQuerySchema,
        response: withOkResponse(activeUsersResponseSchema, "Active users timeline"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { POSTHOG_API_SECRET, POSTHOG_PROJECT_ID } = fastify.config;
      if (!POSTHOG_API_SECRET || !POSTHOG_PROJECT_ID) {
        throw serviceUnavailable();
      }

      const days = request.query.days ?? 90;
      return fetchActiveUsersTimeline(POSTHOG_API_SECRET, POSTHOG_PROJECT_ID, days);
    },
  );

  fastify.get(
    "/funnel",
    {
      schema: {
        description: "Returns period-based signup → contacts → interactions funnel from Supabase.",
        response: withOkResponse(funnelResponseSchema, "Funnel conversion stats"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      try {
        return await fetchFunnelPeriods();
      } catch (error) {
        request.log.error({ error }, "get_funnel_periods RPC failed");
        throw error;
      }
    },
  );

  fastify.get(
    "/nps",
    {
      schema: {
        description: "Returns NPS survey results from PostHog (last 90 days).",
        response: withOkResponse(npsResponseSchema, "NPS survey results"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async () => {
      const { POSTHOG_API_SECRET, POSTHOG_PROJECT_ID } = fastify.config;
      if (!POSTHOG_API_SECRET || !POSTHOG_PROJECT_ID) {
        throw serviceUnavailable();
      }

      return fetchNpsResults(POSTHOG_API_SECRET, POSTHOG_PROJECT_ID);
    },
  );

  fastify.get(
    "/total-users",
    {
      schema: {
        description: "Returns cumulative user count per day (all-time growth curve).",
        response: withOkResponse(totalUsersResponseSchema, "Total users growth timeline"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      try {
        return await fetchTotalUsersGrowth();
      } catch (error) {
        request.log.error({ error }, "get_total_users_growth RPC failed");
        throw error;
      }
    },
  );

  fastify.get(
    "/github-stars",
    {
      schema: {
        description: "Returns the GitHub star count for the configured repository.",
        response: withOkResponse(githubStarsResponseSchema, "GitHub star count"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async () => fetchGithubStars(),
  );
};
