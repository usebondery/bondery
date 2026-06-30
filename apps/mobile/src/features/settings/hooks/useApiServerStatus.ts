import { useCallback, useEffect, useState } from "react";
import * as Network from "expo-network";
import { useFocusEffect } from "expo-router";
import { API_URL } from "../../../lib/config";

export type ApiServerStatus = "checking" | "connected" | "offline" | "unreachable";

const STATUS_PROBE_TIMEOUT_MS = 5_000;

async function isDeviceOffline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();

  if (state.isConnected === false) {
    return true;
  }

  if (state.isInternetReachable === false) {
    return true;
  }

  return false;
}

async function probeApiServer(): Promise<boolean> {
  if (!API_URL) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STATUS_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/status`, {
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

export function useApiServerStatus() {
  const [status, setStatus] = useState<ApiServerStatus>("checking");

  const refresh = useCallback(async () => {
    setStatus("checking");

    if (await isDeviceOffline()) {
      setStatus("offline");
      return;
    }

    const isReachable = await probeApiServer();
    setStatus(isReachable ? "connected" : "unreachable");
  }, []);

  useEffect(() => {
    void refresh();

    const subscription = Network.addNetworkStateListener(() => {
      void refresh();
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    status,
    isChecking: status === "checking",
    refresh,
  };
}
