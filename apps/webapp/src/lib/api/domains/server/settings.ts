import "server-only";

import { isApiUnavailableResponseStatus } from "@/lib/api/availability";
import {
  parseSettingsQueryResult,
  parseUserSettingsData,
  SETTINGS_API_PATH,
  type SettingsQueryResult,
  type UserSettingsData,
} from "@/lib/api/resources/settings";
import { type ServerApiFetchOptions, serverApiFetch, serverApiJson } from "@/lib/api/server";

export type GetSettingsServerOptions = Pick<
  ServerApiFetchOptions,
  "cache" | "next" | "transportPolicy"
>;

const DEFAULT_SERVER_OPTIONS: ServerApiFetchOptions = {
  next: { tags: ["settings"] },
};

export type SettingsBootstrapResult =
  | { status: "ok"; settings: UserSettingsData; queryData: SettingsQueryResult }
  | { status: "unauthorized" }
  | { status: "unavailable" };

/** Routing probe: tri-state outcome without transport redirects. */
export async function probeSettingsServer(): Promise<SettingsBootstrapResult> {
  try {
    const response = await serverApiFetch(SETTINGS_API_PATH, undefined, {
      cache: "no-store",
      transportPolicy: false,
    });

    if (response.status === 401) {
      return { status: "unauthorized" };
    }

    if (isApiUnavailableResponseStatus(response.status)) {
      return { status: "unavailable" };
    }

    if (response.ok) {
      const result = (await response.json()) as SettingsQueryResult;
      const queryData = parseSettingsQueryResult(result);
      return {
        queryData,
        settings: parseUserSettingsData(queryData.data ?? {}),
        status: "ok",
      };
    }

    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getSettingsServer(
  options: GetSettingsServerOptions = {},
): Promise<SettingsQueryResult> {
  const raw = await serverApiJson<SettingsQueryResult>(SETTINGS_API_PATH, undefined, {
    ...DEFAULT_SERVER_OPTIONS,
    ...options,
  });
  return parseSettingsQueryResult(raw);
}
