import { serverApiJsonOrNull } from "@/lib/api/server";
import { API_ROUTES } from "@bondery/helpers/globals/paths";

export interface ActiveUsersTimelinePoint {
  date: string;
  dau: number;
  wau: number;
  mau: number;
}

export interface ActiveUsersData {
  timeline: ActiveUsersTimelinePoint[];
}

export interface FunnelPeriod {
  periodKey: string;
  periodLabel: string;
  signups: number;
  contacts: number;
  interactions: number;
  signupsToContactsPct: number;
  contactsToInteractionsPct: number;
}

export interface NpsData {
  score: number | null;
  responses: number;
  promoters: number;
  passives: number;
  detractors: number;
}

export interface TotalUsersPoint {
  date: string;
  total: number;
}

export interface TotalUsersData {
  timeline: TotalUsersPoint[];
}

export interface GithubStarsData {
  stars: number;
  repo: string;
}

const STATS_BASE = API_ROUTES.ADMIN_STATS;
const CACHE_SECONDS = 300; // 5-minute cache
const cacheOpts = { next: { revalidate: CACHE_SECONDS } };

/**
 * Fetches all KPI stats in parallel from the Fastify API.
 * Returns null for each section that fails (PostHog not configured, etc.).
 */
export async function getStatsData() {
  const [activeUsers, funnelResult, nps, totalUsers, githubStars] = await Promise.all([
    serverApiJsonOrNull<ActiveUsersData>(
      `${STATS_BASE}/active-users?days=90`,
      undefined,
      cacheOpts,
    ),
    serverApiJsonOrNull<{ periods: FunnelPeriod[] }>(`${STATS_BASE}/funnel`, undefined, cacheOpts),
    serverApiJsonOrNull<NpsData>(`${STATS_BASE}/nps`, undefined, cacheOpts),
    serverApiJsonOrNull<TotalUsersData>(`${STATS_BASE}/total-users`, undefined, cacheOpts),
    serverApiJsonOrNull<GithubStarsData>(`${STATS_BASE}/github-stars`, undefined, cacheOpts),
  ]);

  const funnel: FunnelPeriod[] | null = funnelResult?.periods ?? null;

  return { activeUsers, funnel, nps, totalUsers, githubStars };
}
