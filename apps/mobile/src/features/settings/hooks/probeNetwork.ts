import * as Network from "expo-network";

export const STATUS_PROBE_TIMEOUT_MS = 5_000;

export async function isDeviceOffline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();

  if (state.isConnected === false) {
    return true;
  }

  if (state.isInternetReachable === false) {
    return true;
  }

  return false;
}
