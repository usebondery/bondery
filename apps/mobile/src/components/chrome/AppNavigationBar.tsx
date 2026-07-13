import { NavigationBar } from "expo-navigation-bar";
import { Platform } from "react-native";
import { useResolvedMobileTheme } from "../../theme/useResolvedMobileTheme";

/**
 * Android navigation bar button style synced to the resolved in-app theme.
 * Light backgrounds use dark buttons; dark backgrounds use light buttons.
 *
 * Note: expo-navigation-bar uses inverted style names vs expo-status-bar.
 */
export function AppNavigationBar() {
  const resolvedTheme = useResolvedMobileTheme();

  if (Platform.OS !== "android") {
    return null;
  }

  return <NavigationBar style={resolvedTheme === "dark" ? "dark" : "light"} />;
}
