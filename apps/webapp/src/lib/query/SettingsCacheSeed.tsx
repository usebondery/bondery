"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect } from "react";
import type { SettingsQueryResult } from "@/lib/api/resources/settings";
import { settingsKeys } from "@/lib/query/keys";

/** Seeds TanStack settings cache from layout bootstrap (avoids duplicate RSC prefetch). */
export function SettingsCacheSeed({ data }: { data: SettingsQueryResult }) {
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    queryClient.setQueryData(settingsKeys.me(), data);
  }, [queryClient, data]);

  return null;
}
