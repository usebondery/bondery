/**
 * Stats API Routes (admin-only)
 * Provides KPI data for the internal dashboard.
 */

import type { FastifyReply } from "fastify";
import type { AppFastifyInstance, AppRoutePlugin } from "../../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { GITHUB_REPO_URL } from "@bondery/helpers/globals/paths";
import { applyOpenApiRouteMeta } from "../../../lib/openapi-route-meta.js";
import { withOkResponse } from "../../../lib/openapi-route-responses.js";
import { createAdminClient } from "../../../lib/supabase.js";
import { getActiveUsersTimeline, getNpsResults } from "../../../lib/posthog.js";

// ── Response schemas ─────────────────────────────────────────────────────────

const activeUsersTimelinePointSchema = z.object({
  date: z.string(),
  dau: z.number(),
  wau: z.number(),
  mau: z.number(),
});

const activeUsersResponseSchema = z.object({
  timeline: z.array(activeUsersTimelinePointSchema),
});

const activeUsersQuerySchema = z.object({
  days: z.coerce.number().int().min(30).max(180).optional().default(90),
});

const funnelPeriodSchema = z.object({
  periodKey: z.string(),
  periodLabel: z.string(),
  signups: z.number(),
  contacts: z.number(),
  interactions: z.number(),
  signupsToContactsPct: z.number(),
  contactsToInteractionsPct: z.number(),
});

const funnelResponseSchema = z.object({
  periods: z.array(funnelPeriodSchema),
});

const npsResponseSchema = z.object({
  score: z.number().nullable(),
  responses: z.number(),
  promoters: z.number(),
  passives: z.number(),
  detractors: z.number(),
});

const totalUsersPointSchema = z.object({
  date: z.string(),
  total: z.number(),
});

const totalUsersResponseSchema = z.object({
  timeline: z.array(totalUsersPointSchema),
});

const githubStarsResponseSchema = z.object({
  stars: z.number(),
  repo: z.string(),
});

// ── Route plugin ─────────────────────────────────────────────────────────────

export const statsRoutes: AppRoutePlugin = async (fastify) => {
  // Tag all routes in this plugin for OpenAPI docs
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.config = { ...routeOptions.config, rateLimit: false };
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Stats"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });

  // All stats routes require admin access
  fastify.addHook("onRequest", fastify.auth([fastify.verifyAdmin]));

  /**
   * GET /api/stats/active-users
   * Returns DAU/WAU/MAU timeline from PostHog.
   */
  fastify.get(
    "/active-users",
    {
      schema: {
        description: "Returns DAU/WAU/MAU timeline from PostHog.",
        querystring: activeUsersQuerySchema,
        response: withOkResponse(activeUsersResponseSchema, "Active users timeline"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { POSTHOG_API_SECRET, POSTHOG_PROJECT_ID } = fastify.config;
      if (!POSTHOG_API_SECRET || !POSTHOG_PROJECT_ID) {
        return reply.status(503).send({ error: "PostHog not configured" });
      }

      const days = request.query.days ?? 90;
      const timeline = await getActiveUsersTimeline(POSTHOG_API_SECRET, POSTHOG_PROJECT_ID, days);
      return { timeline };
    },
  );

  /**
   * GET /api/stats/funnel
   * Returns period-based signup → contacts → interactions funnel from Supabase.
   * "contacts" = users who signed up in the period AND have ≥10 people records.
   */
  fastify.get(
    "/funnel",
    {
      schema: {
        description:
          "Returns period-based signup → contacts → interactions funnel from Supabase.",
        response: withOkResponse(funnelResponseSchema, "Funnel conversion stats"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const adminClient = createAdminClient();

      const { data, error } = await adminClient.rpc("get_funnel_periods");

      if (error) {
        request.log.error({ error }, "get_funnel_periods RPC failed");
        return reply.status(500).send({ error: "Failed to fetch funnel stats" });
      }

      const periods = (data ?? []).map((item) => ({
        periodKey: item.period_key,
        periodLabel: item.period_label,
        signups: Number(item.signups) || 0,
        contacts: Number(item.contacts) || 0,
        interactions: Number(item.interactions) || 0,
        signupsToContactsPct: Number(item.signups_to_contacts_pct) || 0,
        contactsToInteractionsPct: Number(item.contacts_to_interactions_pct) || 0,
      }));

      return { periods };
    },
  );

  /**
   * GET /api/stats/nps
   * Returns NPS survey results from PostHog (last 90 days).
   */
  fastify.get(
    "/nps",
    {
      schema: {
        description: "Returns NPS survey results from PostHog (last 90 days).",
        response: withOkResponse(npsResponseSchema, "NPS survey results"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (_request, reply) => {
      const { POSTHOG_API_SECRET, POSTHOG_PROJECT_ID } = fastify.config;
      if (!POSTHOG_API_SECRET || !POSTHOG_PROJECT_ID) {
        return reply.status(503).send({ error: "PostHog not configured" });
      }

      const data = await getNpsResults(POSTHOG_API_SECRET, POSTHOG_PROJECT_ID);
      return data;
    },
  );

  /**
   * GET /api/stats/total-users
   * Returns cumulative user count per day (all-time growth curve).
   */
  fastify.get(
    "/total-users",
    {
      schema: {
        description: "Returns cumulative user count per day (all-time growth curve).",
        response: withOkResponse(totalUsersResponseSchema, "Total users growth timeline"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const adminClient = createAdminClient();

      const { data, error } = await adminClient.rpc("get_total_users_growth");

      if (error) {
        request.log.error({ error }, "get_total_users_growth RPC failed");
        return reply.status(500).send({ error: "Failed to fetch total users growth" });
      }

      const timeline = (data ?? []).map((item) => ({
        date: String(item.date),
        total: Number(item.total) || 0,
      }));

      return { timeline };
    },
  );

  /**
   * GET /api/stats/github-stars
   * Returns the GitHub star count for the configured repository.
   */
  fastify.get(
    "/github-stars",
    {
      schema: {
        description: "Returns the GitHub star count for the configured repository.",
        response: withOkResponse(githubStarsResponseSchema, "GitHub star count"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (_request, reply) => {
      const res = await fetch(GITHUB_REPO_URL, {
        headers: { "User-Agent": "bondery-stats-api" },
      });

      if (!res.ok) {
        return reply.status(502).send({ error: "Failed to fetch GitHub repo data" });
      }

      const payload = (await res.json()) as { stargazers_count?: number };
      return {
        stars: payload.stargazers_count ?? 0,
        repo: GITHUB_REPO_URL.replace("https://api.github.com/repos/", ""),
      };
    },
  );
};
