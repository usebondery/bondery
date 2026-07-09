"use client";

import { useQuery } from "@tanstack/react-query";

import { getAdminStatsDashboard } from "@/lib/api/domains/stats";

import { statsKeys } from "@/lib/query/keys";

const STATS_STALE_TIME_MS = 5 * 60 * 1000;

export function useAdminStatsDashboardQuery() {
  return useQuery({
    queryFn: getAdminStatsDashboard,
    queryKey: statsKeys.dashboard(),

    staleTime: STATS_STALE_TIME_MS,
  });
}
