import { API_URL } from "@/lib/config";
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

const STATS_URL = `${API_URL}${API_ROUTES.ADMIN_STATS}`;
const CACHE_SECONDS = 300; // 5-minute cache

/**
 * Fetches all KPI stats in parallel from the Fastify API.
 * Returns null for each section that fails (PostHog not configured, etc.).
 */
export async function getStatsData(headers: HeadersInit) {
  const [activeUsersRes, funnelRes, npsRes, totalUsersRes, githubStarsRes] = await Promise.all([
    fetch(`${STATS_URL}/active-users?days=90`, {
      headers,
      next: { revalidate: CACHE_SECONDS },
    }).catch(() => null),
    fetch(`${STATS_URL}/funnel`, {
      headers,
      next: { revalidate: CACHE_SECONDS },
    }).catch(() => null),
    fetch(`${STATS_URL}/nps`, {
      headers,
      next: { revalidate: CACHE_SECONDS },
    }).catch(() => null),
    fetch(`${STATS_URL}/total-users`, {
      headers,
      next: { revalidate: CACHE_SECONDS },
    }).catch(() => null),
    fetch(`${STATS_URL}/github-stars`, {
      headers,
      next: { revalidate: CACHE_SECONDS },
    }).catch(() => null),
  ]);

  const activeUsers: ActiveUsersData | null = activeUsersRes?.ok
    ? await activeUsersRes.json()
    : null;

  const funnelResult = funnelRes?.ok ? await funnelRes.json() : null;
  const funnel: FunnelPeriod[] | null = funnelResult?.periods ?? null;

  const nps: NpsData | null = npsRes?.ok ? await npsRes.json() : null;

  const totalUsers: TotalUsersData | null = totalUsersRes?.ok ? await totalUsersRes.json() : null;

  const githubStars: GithubStarsData | null = githubStarsRes?.ok
    ? await githubStarsRes.json()
    : null;

  return { activeUsers, funnel, nps, totalUsers, githubStars };
}
