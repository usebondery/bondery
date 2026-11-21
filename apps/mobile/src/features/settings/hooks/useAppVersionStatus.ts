import { API_ROUTES, isVersionBelow } from "@bondery/helpers";
import * as Network from "expo-network";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../../lib/config";
import { isDeviceOffline, STATUS_PROBE_TIMEOUT_MS } from "./probeNetwork";

export type AppVersionStatus = "checking" | "latest" | "offline" | "outdated" | "unreachable";

type VersionProbe = { latestVersion: string | null; status: AppVersionStatus };

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

  const applyProbe = useCallback((result: VersionProbe) => {
    setLatestVersion(result.latestVersion);
    setStatus(result.status);
  }, []);

  /** Probes the server and returns the result. It sets no state. */
  const probe = useCallback(async (): Promise<VersionProbe> => {
    if (await isDeviceOffline()) {
      return { latestVersion: null, status: "offline" };
    }

    const advertised = await probeLatestAppVersion();
    if (!advertised) {
      return { latestVersion: null, status: "unreachable" };
    }

    return {
      latestVersion: advertised,
      status: isVersionBelow(currentVersion, advertised) ? "outdated" : "latest",
    };
  }, [currentVersion]);

  const refresh = useCallback(async () => {
    setStatus("checking");
    applyProbe(await probe());
  }, [applyProbe, probe]);

  useEffect(() => {
    // The state starts as "checking", so the first probe needs no reset.
    void probe().then(applyProbe);

    const subscription = Network.addNetworkStateListener(() => {
      void refresh();
    });

    return () => {
      subscription.remove();
    };
  }, [applyProbe, probe, refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    isChecking: status === "checking",
    latestVersion,
    refresh,
    status,
  };
}
