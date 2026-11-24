import { detachPromise } from "@bondery/helpers/async";
import * as Network from "expo-network";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../../lib/config";
import { isDeviceOffline, STATUS_PROBE_TIMEOUT_MS } from "./probeNetwork";

type ApiServerStatus = "checking" | "connected" | "offline" | "unreachable";

async function probeApiServer(): Promise<boolean> {
  if (!API_URL) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STATUS_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/health/live`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const body = (await response.json()) as { status?: string };
    return body.status === "ok";
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function useApiServerStatus() {
  const [status, setStatus] = useState<ApiServerStatus>("checking");

  /** Probes the server and returns the result. It sets no state. */
  const probe = useCallback(async (): Promise<ApiServerStatus> => {
    if (await isDeviceOffline()) {
      return "offline";
    }

    return (await probeApiServer()) ? "connected" : "unreachable";
  }, []);

  const refresh = useCallback(async () => {
    setStatus("checking");
    setStatus(await probe());
  }, [probe]);

  useEffect(() => {
    // The state starts as "checking", so the first probe needs no reset.
    detachPromise(probe().then(setStatus));

    const subscription = Network.addNetworkStateListener(() => {
      detachPromise(refresh());
    });

    return () => {
      subscription.remove();
    };
  }, [probe, refresh]);

  useFocusEffect(
    useCallback(() => {
      detachPromise(refresh());
    }, [refresh]),
  );

  return {
    isChecking: status === "checking",
    refresh,
    status,
  };
}

export type { ApiServerStatus };
export { useApiServerStatus };
