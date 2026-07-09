import { clientApiJsonOrNull } from "@/lib/api/client";
import {
  type ActiveUsersData,
  type AdminStatsDashboard,
  assembleAdminStatsDashboard,
  buildActiveUsersStatsPath,
  buildFunnelStatsPath,
  buildGithubStarsStatsPath,
  buildNpsStatsPath,
  buildTotalUsersStatsPath,
  type FunnelPeriod,
  type GithubStarsData,
  type NpsData,
  type TotalUsersData,
} from "@/lib/api/resources/stats";

export type { AdminStatsDashboard };

export async function getAdminStatsDashboard(): Promise<AdminStatsDashboard> {
  const [activeUsers, funnel, nps, totalUsers, githubStars] = await Promise.all([
    clientApiJsonOrNull<ActiveUsersData>(buildActiveUsersStatsPath()),
    clientApiJsonOrNull<{ periods: FunnelPeriod[] }>(buildFunnelStatsPath()),
    clientApiJsonOrNull<NpsData>(buildNpsStatsPath()),
    clientApiJsonOrNull<TotalUsersData>(buildTotalUsersStatsPath()),
    clientApiJsonOrNull<GithubStarsData>(buildGithubStarsStatsPath()),
  ]);

  return assembleAdminStatsDashboard({
    activeUsers,
    funnel,
    githubStars,
    nps,
    totalUsers,
  });
}
