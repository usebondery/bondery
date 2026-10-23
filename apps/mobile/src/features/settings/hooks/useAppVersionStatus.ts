import { API_ROUTES, isVersionBelow } from "@bondery/helpers";
import * as Network from "expo-network";
import { useFocusEffect } from "expo-router";
import { useEffect, useState } from "react";
import { API_URL } from "../../../lib/config";
import { isDeviceOffline, STATUS_PROBE_TIMEOUT_MS } from "./probeNetwork";

export type AppVersionStatus = "checking" | "latest" | "offline" | "outdated" | "unreachable";

async function probeLatestAppVersion(): Promise<string | null> {
  if (!API_URL) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STATUS_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${API_ROUTES.MOBILE}/manifest`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { mobile?: { latestVersion?: string } };
    const latestVersion = body.mobile?.latestVersion?.trim();
    return latestVersion ? latestVersion : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function useAppVersionStatus(currentVersion: string) {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<AppVersionStatus>("checking");

  async function refresh() {
    setStatus("checking");

    if (await isDeviceOffline()) {
      setLatestVersion(null);
      setStatus("offline");
      return;
    }

    const advertised = await probeLatestAppVersion();
    if (!advertised) {
      setLatestVersion(null);
      setStatus("unreachable");
      return;
    }

    setLatestVersion(advertised);
    setStatus(isVersionBelow(currentVersion, advertised) ? "outdated" : "latest");
  }

  useEffect(() => {
    void refresh();

    const subscription = Network.addNetworkStateListener(() => {
      void refresh();
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  useFocusEffect(() => {
    void refresh();
  });

  return {
    isChecking: status === "checking",
    latestVersion,
    refresh,
    status,
  };
}
