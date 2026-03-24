/**
 * Stats API Routes (admin-only)
 * Provides KPI data for the internal dashboard.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { GITHUB_REPO_URL } from "@bondery/helpers/globals/paths";
import { createAdminClient } from "../../lib/supabase.js";
import { getActiveUsersTimeline, getNpsResults } from "../../lib/posthog.js";

// ── Response schemas ─────────────────────────────────────────────────────────

const ActiveUsersTimelinePoint = Type.Object({
  date: Type.String(),
  dau: Type.Number(),
  wau: Type.Number(),
  mau: Type.Number(),
});

const ActiveUsersResponse = Type.Object({
  timeline: Type.Array(ActiveUsersTimelinePoint),
});

const ActiveUsersQuery = Type.Object({
  days: Type.Optional(Type.Number({ minimum: 30, maximum: 180, default: 90 })),
});

const FunnelPeriod = Type.Object({
  periodKey: Type.String(),
  periodLabel: Type.String(),
  signups: Type.Number(),
  contacts: Type.Number(),
  interactions: Type.Number(),
  signupsToContactsPct: Type.Number(),
  contactsToInteractionsPct: Type.Number(),
});

const FunnelResponse = Type.Object({
  periods: Type.Array(FunnelPeriod),
});

const NpsResponse = Type.Object({
  score: Type.Union([Type.Number(), Type.Null()]),
  responses: Type.Number(),
  promoters: Type.Number(),
  passives: Type.Number(),
  detractors: Type.Number(),
});

const TotalUsersPoint = Type.Object({
  date: Type.String(),
  total: Type.Number(),
});

const TotalUsersResponse = Type.Object({
  timeline: Type.Array(TotalUsersPoint),
});

const GithubStarsResponse = Type.Object({
  stars: Type.Number(),
  repo: Type.String(),
});

// ── Route plugin ─────────────────────────────────────────────────────────────

export async function statsRoutes(fastify: FastifyInstance) {
  // Tag all routes in this plugin for OpenAPI docs
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Stats"] };
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
        querystring: ActiveUsersQuery,
        response: { 200: ActiveUsersResponse },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: typeof ActiveUsersQuery.static }>,
      reply: FastifyReply,
    ) => {
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
        response: { 200: FunnelResponse },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
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
        response: { 200: NpsResponse },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
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
        response: { 200: TotalUsersResponse },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
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
        response: { 200: GithubStarsResponse },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
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
}
