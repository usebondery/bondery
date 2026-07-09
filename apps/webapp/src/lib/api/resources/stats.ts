import { API_ROUTES } from "@bondery/helpers/globals/paths";

export interface ActiveUsersTimelinePoint {
  date: string;
  dau: number;
  mau: number;
  wau: number;
}

export interface ActiveUsersData {
  timeline: ActiveUsersTimelinePoint[];
}

export interface FunnelPeriod {
  contacts: number;
  contactsToInteractionsPct: number;
  interactions: number;
  periodKey: string;
  periodLabel: string;
  signups: number;
  signupsToContactsPct: number;
}

export interface NpsData {
  detractors: number;
  passives: number;
  promoters: number;
  responses: number;
  score: number | null;
}

export interface TotalUsersPoint {
  date: string;
  total: number;
}

export interface TotalUsersData {
  timeline: TotalUsersPoint[];
}

export interface GithubStarsData {
  repo: string;
  stars: number;
}

export interface AdminStatsDashboard {
  activeUsers: ActiveUsersData | null;
  funnel: FunnelPeriod[] | null;
  githubStars: GithubStarsData | null;
  nps: NpsData | null;
  totalUsers: TotalUsersData | null;
}

export const ADMIN_STATS_BASE = API_ROUTES.ADMIN_STATS;
export const ACTIVE_USERS_STATS_DAYS = 90;

export function buildActiveUsersStatsPath(days = ACTIVE_USERS_STATS_DAYS): string {
  return `${ADMIN_STATS_BASE}/active-users?days=${days}`;
}

export function buildFunnelStatsPath(): string {
  return `${ADMIN_STATS_BASE}/funnel`;
}

export function buildNpsStatsPath(): string {
  return `${ADMIN_STATS_BASE}/nps`;
}

export function buildTotalUsersStatsPath(): string {
  return `${ADMIN_STATS_BASE}/total-users`;
}

export function buildGithubStarsStatsPath(): string {
  return `${ADMIN_STATS_BASE}/github-stars`;
}

export interface AdminStatsDashboardSections {
  activeUsers: ActiveUsersData | null;
  funnel: { periods?: FunnelPeriod[] } | null;
  githubStars: GithubStarsData | null;
  nps: NpsData | null;
  totalUsers: TotalUsersData | null;
}

export function assembleAdminStatsDashboard(
  sections: AdminStatsDashboardSections,
): AdminStatsDashboard {
  return {
    activeUsers: sections.activeUsers,
    funnel: sections.funnel?.periods ?? null,
    githubStars: sections.githubStars,
    nps: sections.nps,
    totalUsers: sections.totalUsers,
  };
}
