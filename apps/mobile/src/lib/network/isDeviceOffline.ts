import * as Network from "expo-network";

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
