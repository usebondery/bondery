import { cache } from "react";
import { probeSettingsServer } from "@/lib/api/domains/server/settings";
import type { SettingsQueryResult, UserSettingsData } from "@/lib/api/resources/settings";

export type { UserSettingsData };

export type AppBootstrapResult =
  | { status: "ok"; settings: UserSettingsData; settingsQueryData: SettingsQueryResult }
  | { status: "unauthorized" }
  | { status: "unavailable" };

/**
 * Server routing probe: settings fetch + tri-state outcome for app layout guards.
 *
 * Wrapped in React cache() so it executes at most once per server render.
 */
export const getAppBootstrap = cache(async (): Promise<AppBootstrapResult> => {
  const result = await probeSettingsServer();
  if (result.status !== "ok") {
    return result;
  }
  return {
    settings: result.settings,
    settingsQueryData: result.queryData,
    status: "ok",
  };
});
