import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

export async function openExternalUrl(url: string, onError?: () => void): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
    return;
  } catch {
    // Fall back to platform URL open when in-app browser cannot be presented.
  }

  try {
    await Linking.openURL(url);
  } catch {
    onError?.();
  }
}
