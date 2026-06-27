import NetInfo from "@react-native-community/netinfo";

export async function isDeviceOffline(): Promise<boolean> {
  const state = await NetInfo.fetch();

  if (state.isConnected === false) {
    return true;
  }

  if (state.isInternetReachable === false) {
    return true;
  }

  return false;
}
